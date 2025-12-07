import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isPublicRoute = request.nextUrl.pathname === '/'

  // Redirect home to dashboard (auth check happens in layout)
  if (isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow API routes to handle their own auth
  if (isApiRoute) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}

