import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl

    // Always allow the login page and auth API through
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    const sitePassword = process.env.SITE_PASSWORD
    // If no password is set, block access with a clear message
    if (!sitePassword) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    const cookie = req.cookies.get('trace_auth')?.value
    if (cookie !== sitePassword) {
      const loginUrl = req.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  } catch {
    // On any error, redirect to login rather than failing open
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest).*)'],
}
