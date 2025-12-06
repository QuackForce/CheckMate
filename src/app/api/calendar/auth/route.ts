import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// GET /api/calendar/auth - Initiate Google Calendar OAuth
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
    
    if (!googleClientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
    }

    // Get return URL from query params
    const returnTo = request.nextUrl.searchParams.get('returnTo') || '/settings/integrations'
    
    // Build Google OAuth URL for calendar access
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/callback`
    
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent', // Force consent to get refresh token
      state: returnTo, // Pass return URL in state
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Calendar auth error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

