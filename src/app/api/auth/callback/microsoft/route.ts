import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { getMicrosoftTokens, getMicrosoftUser } from '@/lib/services/oauth'
import { getPayloadClient } from '@/lib/get-payload'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    console.error('[OAuth/Microsoft] Error or missing code:', error)
    return NextResponse.redirect(
      new URL('/nl/login?error=sso_error', request.url),
    )
  }

  try {
    // 1. Exchange auth code for tokens
    const tokens = await getMicrosoftTokens(code)

    // 2. Get user profile from Microsoft Graph
    const msUser = await getMicrosoftUser(tokens.access_token)

    if (!msUser.email) {
      return NextResponse.redirect(
        new URL('/nl/login?error=sso_error', request.url),
      )
    }

    const payload = await getPayloadClient()

    // 3. Find existing user — first by email, then by oauthId
    let user = await findUserByEmail(payload, msUser.email)

    if (!user) {
      user = await findUserByOAuthId(payload, 'microsoft', msUser.id)
    }

    if (user) {
      // Update OAuth fields if not already set
      const updates: Record<string, unknown> = {}
      if (!user.oauthProvider) {
        updates.oauthProvider = 'microsoft'
        updates.oauthId = msUser.id
      }
      if (msUser.name && !user.name) {
        updates.name = msUser.name
      }

      if (Object.keys(updates).length > 0) {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: updates,
          overrideAccess: true,
        })
      }
    } else {
      // Create new user
      const created = await payload.create({
        collection: 'users',
        data: {
          email: msUser.email.toLowerCase(),
          name: msUser.name || '',
          password: crypto.randomUUID() + crypto.randomUUID(), // random password for OAuth users
          oauthProvider: 'microsoft',
          oauthId: msUser.id,
          avatarUrl: '',
          role: 'member',
        },
        overrideAccess: true,
      })
      user = created
    }

    // 4. Create Payload JWT session (same approach as magic-link verify)
    const secret = payload.secret
    const usersCollection = payload.collections['users']
    const tokenExpiration: number =
      usersCollection.config.auth &&
      typeof usersCollection.config.auth === 'object'
        ? (usersCollection.config.auth as { tokenExpiration?: number })
            .tokenExpiration || 7200
        : 7200

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

    // 5. Set cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/nl', request.url))

    response.cookies.set('payload-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(exp * 1000),
    })

    return response
  } catch (err) {
    console.error('[OAuth/Microsoft] Callback error:', err)
    return NextResponse.redirect(
      new URL('/nl/login?error=sso_error', request.url),
    )
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findUserByEmail(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  email: string,
) {
  const result = await payload.find({
    collection: 'users',
    where: {
      and: [
        { email: { equals: email.toLowerCase() } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}

async function findUserByOAuthId(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  provider: string,
  oauthId: string,
) {
  const result = await payload.find({
    collection: 'users',
    where: {
      and: [
        { oauthProvider: { equals: provider } },
        { oauthId: { equals: oauthId } },
        { deletedAt: { exists: false } },
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  return result.docs[0] ?? null
}
