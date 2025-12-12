import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * Custom signout endpoint that handles both NextAuth sessions and emergency sessions
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Check if there's an emergency session
    const emergencyCookie = cookieStore.get('emergency-session')
    
    // Clear emergency session cookie if it exists
    if (emergencyCookie) {
      cookieStore.set('emergency-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
      })
      console.log('[SIGNOUT] Cleared emergency session cookie')
    }
    
    // Sign out from NextAuth (this handles NextAuth sessions)
    // Note: signOut from NextAuth is a server action, so we need to redirect
    // For API route, we'll just clear cookies and return success
    // The client should redirect after calling this
    
    return NextResponse.json({ success: true, message: 'Signed out successfully' })
  } catch (error: any) {
    console.error('[SIGNOUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for signout (redirects to login)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Clear emergency session cookie if it exists
    const emergencyCookie = cookieStore.get('emergency-session')
    if (emergencyCookie) {
      cookieStore.set('emergency-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
      console.log('[SIGNOUT] Cleared emergency session cookie')
    }
    
    // Redirect to login page
    // NextAuth signOut will be handled by the client-side redirect
    return NextResponse.redirect(new URL('/login', request.url))
  } catch (error: any) {
    console.error('[SIGNOUT] Error:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

