import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer, requireAdmin } from '@/lib/auth-utils'
import { auth } from '@/lib/auth'

// GET /api/checks/[id] - Get a specific check
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const check = await db.infraCheck.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: { id: true, name: true, slackChannelName: true },
        },
        assignedEngineer: {
          select: { id: true, name: true, email: true },
        },
        categoryResults: {
          include: {
            items: { orderBy: { order: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 })
    }

    return NextResponse.json(check)
  } catch (error: any) {
    console.error('Error fetching check:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/checks/[id] - Update a check (Engineer+ only)
// Force dynamic rendering for this route

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireEngineer()
  if (authError) return authError

  try {
    const body = await request.json()
    const { 
      scheduledDate, 
      status, 
      notes, 
      assignedEngineerName,
      totalTimeSeconds,
      categories, // For saving check progress
    } = body

    // Get current check to check for calendar event
    const currentCheck = await db.infraCheck.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    })

    if (!currentCheck) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 })
    }

    // Build update data
    const updateData: any = {}
    
    // Handle date update - preserve time if only date is provided
    let newScheduledDate: Date | null = null
    if (scheduledDate !== undefined) {
      // If only date is provided (YYYY-MM-DD format), create date in local timezone
      if (scheduledDate.length === 10) {
        const [year, month, day] = scheduledDate.split('-').map(Number)
        const originalDate = new Date(currentCheck.scheduledDate)
        // Create date in local timezone with original time
        newScheduledDate = new Date(year, month - 1, day, originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds())
      } else {
        // Full datetime provided
        newScheduledDate = new Date(scheduledDate)
      }
      updateData.scheduledDate = newScheduledDate
    }
    
    const dateChanged = newScheduledDate !== null && 
      newScheduledDate.getTime() !== currentCheck.scheduledDate.getTime()
    if (status !== undefined) {
      updateData.status = status
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }
    if (assignedEngineerName !== undefined) {
      updateData.assignedEngineerName = assignedEngineerName
    }
    if (totalTimeSeconds !== undefined) {
      updateData.totalTimeSeconds = totalTimeSeconds
    }

    // Update the check
    const check = await db.infraCheck.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    })

    // Update or create Google Calendar event if date changed
    let calendarUpdateError = null
    let calendarEvent = null
    if (dateChanged) {
      try {
        const session = await auth()
        if (session?.user?.id) {
          const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: {
              googleCalendarAccessToken: true,
              googleCalendarRefreshToken: true,
              googleCalendarExpiresAt: true,
            },
          })

          if (user?.googleCalendarAccessToken) {
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

            // Update or create the calendar event
            const eventStart = newScheduledDate || new Date(scheduledDate)
            const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000) // 1 hour

            if (currentCheck.calendarEventId) {
              // Update existing event
              const updateRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${currentCheck.calendarEventId}`,
                {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    start: {
                      dateTime: eventStart.toISOString(),
                      timeZone: 'America/Los_Angeles',
                    },
                    end: {
                      dateTime: eventEnd.toISOString(),
                      timeZone: 'America/Los_Angeles',
                    },
                  }),
                }
              )

              if (updateRes.ok) {
                calendarEvent = await updateRes.json()
                // Update the calendar event link in case it changed
                await db.infraCheck.update({
                  where: { id: params.id },
                  data: {
                    calendarEventLink: calendarEvent.htmlLink,
                  },
                })
              } else {
                const errorText = await updateRes.text()
                console.error('Failed to update calendar event:', updateRes.status, errorText)
                calendarUpdateError = `Failed to update calendar event: ${updateRes.status}`
              }
            } else {
              // Create new event
              const event = {
                summary: `Infrastructure Check - ${check.client.name}`,
                description: `Scheduled ${check.cadence.toLowerCase()} infrastructure check for ${check.client.name}.\n\nAssigned to: ${check.assignedEngineerName || 'TBD'}\n\nCheck ID: ${check.id}`,
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

              const createRes = await fetch(
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

              if (createRes.ok) {
                calendarEvent = await createRes.json()
                // Save the calendar event info
                await db.infraCheck.update({
                  where: { id: params.id },
                  data: {
                    calendarEventId: calendarEvent.id,
                    calendarEventLink: calendarEvent.htmlLink,
                  },
                })
              } else {
                const errorText = await createRes.text()
                console.error('Failed to create calendar event:', createRes.status, errorText)
                calendarUpdateError = `Failed to create calendar event: ${createRes.status}`
              }
            }
          }
          // If user doesn't have calendar connected, silently skip (not an error)
        }
      } catch (err: any) {
        console.error('Error updating calendar event:', err)
        calendarUpdateError = err.message || 'Unknown error updating calendar event'
      }
    }

    // If categories are provided, update or create them
    if (categories && Array.isArray(categories)) {
      for (const cat of categories) {
        // Check if this is a system ID (from initial load) or a categoryResult ID (already saved)
        // System IDs are UUIDs, but we can check if categoryResult exists
        let categoryResult = await db.categoryResult.findUnique({
          where: { id: cat.id },
        })

        // If categoryResult doesn't exist, check if it's a system ID and create the categoryResult
        if (!categoryResult) {
          // Check if this ID is a system ID
          const system = await db.system.findUnique({
            where: { id: cat.id },
            include: {
              checkItems: true,
            },
          })

          if (system) {
            // Create categoryResult for this system
            categoryResult = await db.categoryResult.create({
              data: {
                checkId: params.id,
                name: cat.name || system.name,
                status: cat.status || 'pending',
                notes: cat.notes || null,
              },
            })

            // Create itemResults for all system check items
            for (const systemItem of system.checkItems) {
              await db.itemResult.create({
                data: {
                  categoryResultId: categoryResult.id,
                  text: systemItem.text,
                  checked: false,
                  notes: null,
                  order: systemItem.order,
                },
              })
            }
          } else {
            // Not a system ID either - skip this category
            console.error(`Category with ID ${cat.id} not found as categoryResult or system`)
            continue
          }
        }

        // Update category result
        await db.categoryResult.update({
          where: { id: categoryResult.id },
          data: {
            status: cat.status,
            notes: cat.notes || null,
          },
        })

        // Update items - need to match by order/text since item IDs might be system item IDs
        if (cat.items && Array.isArray(cat.items)) {
          // Get all itemResults for this category
          const existingItems = await db.itemResult.findMany({
            where: { categoryResultId: categoryResult.id },
            orderBy: { order: 'asc' },
          })

          for (const item of cat.items) {
            // Try to find by ID first
            let itemResult = existingItems.find(i => i.id === item.id)
            
            // If not found by ID, try to match by order/index
            if (!itemResult && typeof item.id === 'string') {
              // Check if this is a system item ID
              const systemItem = await db.systemCheckItem.findUnique({
                where: { id: item.id },
              })
              
              if (systemItem) {
                // Find the corresponding itemResult by order
                const itemIndex = cat.items.indexOf(item)
                itemResult = existingItems[itemIndex]
              }
            }

            if (itemResult) {
              // Update existing item
              await db.itemResult.update({
                where: { id: itemResult.id },
                data: {
                  checked: item.checked,
                  notes: item.notes || null,
                },
              })
            } else {
              // Item doesn't exist - might be a custom item added on the fly
              // Create it
              const maxOrder = existingItems.length > 0 
                ? Math.max(...existingItems.map(i => i.order || 0))
                : -1
              
              await db.itemResult.create({
                data: {
                  categoryResultId: categoryResult.id,
                  text: item.text || '(Custom item)',
                  checked: item.checked,
                  notes: item.notes || null,
                  order: maxOrder + 1,
                },
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ 
      check,
      calendarEvent: calendarEvent ? {
        id: calendarEvent.id,
        link: calendarEvent.htmlLink,
      } : null,
      calendarUpdateError: calendarUpdateError || null,
      message: 'Check updated successfully',
    })
  } catch (error: any) {
    console.error('Error updating check:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/checks/[id] - Delete a check (Admin only)
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  try {
    // Delete associated results first (cascade should handle this, but being explicit)
    // First get all category results for this check
    const categoryResults = await db.categoryResult.findMany({
      where: { checkId: params.id },
      select: { id: true },
    })
    const categoryResultIds = categoryResults.map(cr => cr.id)
    
    // Delete item results
    if (categoryResultIds.length > 0) {
      await db.itemResult.deleteMany({
        where: { categoryResultId: { in: categoryResultIds } },
      })
    }
    await db.categoryResult.deleteMany({
      where: { checkId: params.id },
    })
    
    // Delete the check
    await db.infraCheck.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Check deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting check:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

