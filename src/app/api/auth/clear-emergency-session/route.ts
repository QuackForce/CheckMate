import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

/**
 * Custom endpoint to clear emergency session cookie
 * This should be called before NextAuth's signOut() to ensure emergency sessions are cleared
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
    
    return NextResponse.json({ success: true, message: 'Emergency session cleared' })
  } catch (error: any) {
    console.error('[SIGNOUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to clear emergency session' },
      { status: 500 }
    )
  }
}

