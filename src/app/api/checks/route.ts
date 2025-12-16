import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer } from '@/lib/auth-utils'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Rate limiting (relaxed - page loads)
  const session = await auth()
  const identifier = getIdentifier(session?.user?.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.RELAXED)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  const searchParams = request.nextUrl.searchParams
  
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  try {
    // Build where clause
    const where: any = {}
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { assignedEngineer: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Date range filter (for calendar)
    if (startDate && endDate) {
      where.scheduledDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Get total count
    const total = await db.infraCheck.count({ where })

    // Get checks with relations
    const checks = await db.infraCheck.findMany({
      where,
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        notes: true,
        assignedEngineerName: true, // Include assignedEngineerName field
        calendarEventLink: true, // Include calendarEventLink for schedule page
        Client: {
          select: { id: true, name: true, websiteUrl: true },
        },
        User_InfraCheck_assignedEngineerIdToUser: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      checks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    console.error('Error fetching checks:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/checks - Create a new check (Engineer+ only)
// Force dynamic rendering for this route

export async function POST(request: NextRequest) {
  // Check if user has engineer or admin role
  const { error, session: authSession } = await requireEngineer()
  if (error) return error

  // Rate limiting (general - creating checks)
  const identifier = getIdentifier(authSession?.user?.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before scheduling more checks.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()
    const { 
      clientId, 
      engineerName, 
      cadence, 
      scheduledDate, 
      notes,
      createCalendarEvent,
      sendReminder,
    } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    if (!scheduledDate) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 })
    }

    // Verify client exists
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        ClientSystem: {
          where: { isActive: true },
          include: {
            System: {
              include: {
                SystemCheckItem: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create the check
    const check = await db.infraCheck.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        scheduledDate: new Date(scheduledDate),
        cadence: cadence || 'MONTHLY',
        status: 'SCHEDULED',
        notes: notes || null,
        assignedEngineerName: engineerName || null,
        updatedAt: new Date(),
      },
      include: {
        Client: {
          select: { id: true, name: true },
        },
      },
    })

    // Create category results from client's systems
    if (client.ClientSystem.length > 0) {
      for (const cs of client.ClientSystem) {
        await db.categoryResult.create({
          data: {
            id: crypto.randomUUID(),
            checkId: check.id,
            name: cs.System.name,
            status: 'pending',
            updatedAt: new Date(),
            ItemResult: {
              create: cs.System.SystemCheckItem.map((item, index) => ({
                id: crypto.randomUUID(),
                text: item.text,
                checked: false,
                order: index,
                updatedAt: new Date(),
              })),
            },
          },
        })
      }
    }

    // Create Google Calendar event if requested
    let calendarEvent = null
    let calendarError = null
    if (createCalendarEvent) {
      try {
        const session = await auth()
        if (!session?.user?.id) {
          calendarError = 'Not authenticated'
        } else {
          // Get user's Google Calendar token
          const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
              googleCalendarAccessToken: true,
              googleCalendarRefreshToken: true,
              googleCalendarExpiresAt: true,
            },
          })

          if (!user?.googleCalendarAccessToken) {
            calendarError = 'Google Calendar not connected. Go to Settings > My Integrations to connect.'
          } else {
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
              } else {
                const refreshError = await refreshRes.text()
                console.error('Failed to refresh Google Calendar token:', refreshError)
                calendarError = 'Failed to refresh calendar token'
              }
            }

            if (!calendarError) {
              // Create the calendar event
              const eventStart = new Date(scheduledDate)
              const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000) // 1 hour

              const event = {
                summary: `Infrastructure Check - ${client.name}`,
                description: `Scheduled ${cadence.toLowerCase()} infrastructure check for ${client.name}.\n\nAssigned to: ${engineerName || 'TBD'}\n\nCheck ID: ${check.id}`,
                start: {
                  dateTime: eventStart.toISOString(),
                  timeZone: 'America/Los_Angeles',
                },
                end: {
                  dateTime: eventEnd.toISOString(),
                  timeZone: 'America/Los_Angeles',
                },
                reminders: {
                  useDefault: false,
                  overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'email', minutes: 1440 },
                  ],
                },
              }

              const calendarRes = await fetch(
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

              if (calendarRes.ok) {
                calendarEvent = await calendarRes.json()
                // Update check with calendar event info
                await db.infraCheck.update({
                  where: { id: check.id },
                  data: {
                    calendarEventId: calendarEvent.id,
                    calendarEventLink: calendarEvent.htmlLink,
                  },
                })
              } else {
                const errorText = await calendarRes.text()
                console.error('Google Calendar API error:', calendarRes.status, errorText)
                calendarError = `Failed to create calendar event: ${calendarRes.status} ${errorText.substring(0, 100)}`
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to create calendar event:', err)
        calendarError = err.message || 'Unknown error creating calendar event'
      }
    }

    // TODO: Implement reminder system (can use Google Calendar reminders for now)
    // if (sendReminder) { ... }

    return NextResponse.json({ 
      check,
      calendarEvent: calendarEvent ? {
        id: calendarEvent.id,
        link: calendarEvent.htmlLink,
      } : null,
      calendarError: calendarError || null,
      message: 'Check scheduled successfully',
    })
  } catch (error: any) {
    console.error('Error creating check:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

