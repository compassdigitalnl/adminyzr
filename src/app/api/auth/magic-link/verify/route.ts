import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { verifyMagicLink } from '@/lib/actions/magic-link'
import { getPayloadClient } from '@/lib/get-payload'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/nl/login?error=invalid_token', request.url))
  }

  const user = await verifyMagicLink(token)

  if (!user) {
    return NextResponse.redirect(new URL('/nl/login?error=invalid_token', request.url))
  }

  try {
    const payload = await getPayloadClient()
    const secret = payload.secret

    // Get the Users collection config for tokenExpiration
    const usersCollection = payload.collections['users']
    const tokenExpiration: number =
      usersCollection.config.auth &&
      typeof usersCollection.config.auth === 'object'
        ? (usersCollection.config.auth as { tokenExpiration?: number }).tokenExpiration || 7200
        : 7200

    // Sign a JWT token matching what Payload's login operation does
    const secretKey = new TextEncoder().encode(secret)
    const issuedAt = Math.floor(Date.now() / 1000)
    const exp = issuedAt + tokenExpiration

    const jwtToken = await new SignJWT({
      id: user.id,
      collection: 'users',
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(issuedAt)
      .setExpirationTime(exp)
      .sign(secretKey)

    // Set the payload-token cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/nl', request.url))

    response.cookies.set('payload-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(exp * 1000),
    })

    return response
  } catch (error) {
    console.error('[MagicLink] Error creating session:', error)
    return NextResponse.redirect(new URL('/nl/login?error=session_error', request.url))
  }
}
