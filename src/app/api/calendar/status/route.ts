import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/calendar/status - Check if Google Calendar is connected
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false, error: 'Not authenticated' })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        googleCalendarAccessToken: true,
        googleCalendarExpiresAt: true,
      },
    })

    if (!user?.googleCalendarAccessToken) {
      return NextResponse.json({ 
        connected: false, 
        reason: 'Google Calendar not connected',
      })
    }

    // Check if token is expired
    const isExpired = user.googleCalendarExpiresAt && 
      new Date(user.googleCalendarExpiresAt) < new Date()

    return NextResponse.json({ 
      connected: true,
      expiresAt: user.googleCalendarExpiresAt,
      needsRefresh: isExpired,
    })
  } catch (error: any) {
    console.error('Calendar status error:', error)
    return NextResponse.json({ connected: false, error: error.message })
  }
}

// DELETE /api/calendar/status - Disconnect Google Calendar
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        googleCalendarAccessToken: null,
        googleCalendarRefreshToken: null,
        googleCalendarExpiresAt: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Calendar disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
