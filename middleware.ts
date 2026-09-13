import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl

    if (pathname === '/login' || pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    const password = process.env.TRACE_PASSWORD
    const cookie = req.cookies.get('trace-session')?.value

    if (!password || cookie !== password) {
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
  ],
}
