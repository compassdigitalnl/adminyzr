import { NextRequest, NextResponse } from 'next/server'
import { locales, defaultLocale } from '@/i18n/config'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/portal']

function isPublicPath(pathWithoutLocale: string): boolean {
  return PUBLIC_PATHS.some((p) => pathWithoutLocale.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Payload admin and API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
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
