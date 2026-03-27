import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/i18n/config'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/portal']

function isPublicPath(pathWithoutLocale: string): boolean {
  return PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p))
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = getClientIP(request)

    // Determine rate limit type
    let rlType: 'auth' | 'api' | 'ocr' | 'webhook' = 'api'
    if (pathname.startsWith('/api/auth') || pathname.includes('/login')) rlType = 'auth'
    else if (pathname.startsWith('/api/ocr')) rlType = 'ocr'
    else if (pathname.startsWith('/api/webhooks')) rlType = 'webhook'

    const result = checkRateLimit(ip, rlType)

    if (!result.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(result, rlType),
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          },
        },
      )
    }

    // Add rate limit headers to API responses
    const response = NextResponse.next()
    const headers = getRateLimitHeaders(result, rlType)
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
    return response
  }

  // Skip Payload admin routes
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Skip static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if pathname has a valid locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (!pathnameHasLocale) {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname}`, request.url)
    )
  }

  // Extract path without locale prefix for auth check
  const locale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  const pathWithoutLocale = locale
    ? pathname.replace(`/${locale}`, '') || '/'
    : pathname

  // Public paths: geen auth check nodig
  if (isPublicPath(pathWithoutLocale)) {
    return NextResponse.next()
  }

  // Protected routes: check voor Payload JWT token
  const token = request.cookies.get('payload-token')?.value

  if (!token) {
    const loginUrl = new URL(`/${locale || defaultLocale}/login`, request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon|.*\\..*).*)'],
}
