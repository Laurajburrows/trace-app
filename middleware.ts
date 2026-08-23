import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow the login page and auth API through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const sitePassword = process.env.SITE_PASSWORD
  // If no password is set, allow open access
  if (!sitePassword) return NextResponse.next()

  const cookie = req.cookies.get('trace_auth')?.value
  if (cookie !== btoa(sitePassword)) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest).*)'],
}
