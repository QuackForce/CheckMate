import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Demo mode - skip auth middleware when no OAuth is configured (supports both naming conventions)
const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
const isDemoMode = !googleClientId || googleClientId === 'placeholder'

export function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isPublicRoute = request.nextUrl.pathname === '/'

  // In demo mode, allow all routes
  if (isDemoMode) {
    // Redirect login page to dashboard in demo mode
    if (isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // Redirect home to dashboard in demo mode
    if (isPublicRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
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

