import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Helper to get Google Calendar access token for user
async function getCalendarAccessToken(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      googleCalendarAccessToken: true,
      googleCalendarRefreshToken: true,
      googleCalendarExpiresAt: true,
    },
  })

  if (!user?.googleCalendarAccessToken) {
    return null
  }

  // Check if token is expired
  if (user.googleCalendarExpiresAt && new Date(user.googleCalendarExpiresAt) < new Date()) {
    // Token expired, try to refresh
    if (!user.googleCalendarRefreshToken) {
      return null
    }

    const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId!,
          client_secret: googleClientSecret!,
          grant_type: 'refresh_token',
          refresh_token: user.googleCalendarRefreshToken,
        }),
      })

      if (!response.ok) {
        console.error('Failed to refresh Google Calendar token')
        return null
      }

      const tokens = await response.json()

      // Update the user with new tokens
      await db.user.update({
        where: { id: userId },
        data: {
          googleCalendarAccessToken: tokens.access_token,
          googleCalendarExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      })

      return tokens.access_token
    } catch (error) {
      console.error('Error refreshing Google Calendar token:', error)
      return null
    }
  }

  return user.googleCalendarAccessToken
}

// POST /api/calendar/events - Create a calendar event
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      summary, 
      description, 
      startDateTime, 
      endDateTime,
      attendees,
      checkId,
    } = body

    if (!summary || !startDateTime) {
      return NextResponse.json({ error: 'Summary and start time are required' }, { status: 400 })
    }

    const accessToken = await getCalendarAccessToken(session.user.id)
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected. Go to Settings > My Integrations to connect.' 
      }, { status: 400 })
    }

    // Create event object
    const event: any = {
      summary,
      description: description || '',
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: 'America/Los_Angeles', // You can make this configurable
      },
      end: {
        dateTime: endDateTime 
          ? new Date(endDateTime).toISOString()
          : new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour
        timeZone: 'America/Los_Angeles',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 30 },
          { method: 'email', minutes: 1440 }, // 24 hours
        ],
      },
    }

    // Add attendees if provided
    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map((email: string) => ({ email }))
    }

    // Create event via Google Calendar API
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
      const error = await response.text()
      console.error('Google Calendar API error:', error)
      return NextResponse.json({ 
        error: 'Failed to create calendar event',
        details: error,
      }, { status: 400 })
    }

    const createdEvent = await response.json()

    // If checkId is provided, store the event ID with the check
    if (checkId) {
      await db.infraCheck.update({
        where: { id: checkId },
        data: { 
          calendarEventId: createdEvent.id,
          calendarEventLink: createdEvent.htmlLink,
        },
      })
    }

    return NextResponse.json({
      success: true,
      event: {
        id: createdEvent.id,
        htmlLink: createdEvent.htmlLink,
        summary: createdEvent.summary,
        start: createdEvent.start,
        end: createdEvent.end,
      },
    })
  } catch (error: any) {
    console.error('Calendar event creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/calendar/events - Get calendar events
// Force dynamic rendering for this route

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const accessToken = await getCalendarAccessToken(session.user.id)
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Google Calendar not connected',
        connected: false,
      }, { status: 400 })
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Google Calendar API error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch calendar events',
        connected: false,
      }, { status: 400 })
    }

    const data = await response.json()

    return NextResponse.json({
      connected: true,
      events: data.items || [],
    })
  } catch (error: any) {
    console.error('Calendar fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
