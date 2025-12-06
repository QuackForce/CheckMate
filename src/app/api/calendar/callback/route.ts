import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/calendar/callback - Handle Google Calendar OAuth callback
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/callback`

    if (!googleClientId || !googleClientSecret) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
    }

    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state') || '/settings/integrations'
    const error = request.nextUrl.searchParams.get('error')

    if (error) {
      // User denied access
      const returnUrl = new URL(state, request.url)
      returnUrl.searchParams.set('calendar_error', error)
      return NextResponse.redirect(returnUrl)
    }

    if (!code) {
      return NextResponse.json({ error: 'No authorization code' }, { status: 400 })
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error('Google token error:', errorText)
      const returnUrl = new URL(state, request.url)
      returnUrl.searchParams.set('calendar_error', 'token_exchange_failed')
      return NextResponse.redirect(returnUrl)
    }

    const tokens = await tokenRes.json()

    // Save tokens to user record
    await db.user.update({
      where: { id: session.user.id },
      data: {
        googleCalendarAccessToken: tokens.access_token,
        googleCalendarRefreshToken: tokens.refresh_token || null,
        googleCalendarExpiresAt: tokens.expires_in 
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
    })

    // Redirect back with success
    const returnUrl = new URL(state, request.url)
    returnUrl.searchParams.set('calendar_connected', 'success')
    return NextResponse.redirect(returnUrl)
  } catch (error: any) {
    console.error('Calendar callback error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

