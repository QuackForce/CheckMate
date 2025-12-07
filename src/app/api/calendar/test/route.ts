import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/calendar/test - Create a test calendar event
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleCalendarAccessToken: true,
        googleCalendarRefreshToken: true,
        googleCalendarExpiresAt: true,
      },
    })

    if (!user?.googleCalendarAccessToken) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected',
        connected: false,
      }, { status: 400 })
    }

    // Check if token is expired and refresh if needed
    let accessToken = user.googleCalendarAccessToken
    if (user.googleCalendarExpiresAt && new Date(user.googleCalendarExpiresAt) < new Date() && user.googleCalendarRefreshToken) {
      const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
      const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET
      
      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId!,
          client_secret: googleClientSecret!,
          grant_type: 'refresh_token',
          refresh_token: user.googleCalendarRefreshToken,
        }),
      })

      if (refreshRes.ok) {
        const tokens = await refreshRes.json()
        accessToken = tokens.access_token
        await db.user.update({
          where: { id: session.user.id },
          data: {
            googleCalendarAccessToken: tokens.access_token,
            googleCalendarExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        })
      }
    }

    // Create a test event
    const now = new Date()
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000)

    const event = {
      summary: 'Test Infrastructure Check Event',
      description: 'This is a test event to verify Google Calendar integration is working.',
      start: {
        dateTime: now.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: inOneHour.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
    }

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({ 
        error: 'Failed to create test event',
        status: response.status,
        details: errorText,
      }, { status: 400 })
    }

    const createdEvent = await response.json()

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
      },
      message: 'Test event created successfully! Check your Google Calendar.',
    })
  } catch (error: any) {
    console.error('Calendar test error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}




