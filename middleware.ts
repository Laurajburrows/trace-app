import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl

    // Always allow the login page and auth API through
    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    const sitePassword = process.env.SITE_PASSWORD
    const cookie = req.cookies.get('trace_auth')?.value

    // If no password configured, or cookie doesn't match — redirect to login
    if (!sitePassword || cookie !== sitePassword) {
      const loginUrl = new URL('/login', req.url)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
  } catch {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  // Run on every route except Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
}
