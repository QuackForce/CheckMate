import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'
import { invalidateClientCache } from '@/lib/cache'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Rate limiting
    const identifier = getIdentifier(session?.user?.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.STRICT)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Check permissions - Engineer+ only
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'ADMIN' && userRole !== 'IT_ENGINEER' && userRole !== 'CONSULTANT') {
      return NextResponse.json(
        { error: 'Unauthorized - Engineer access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientIds, updates } = body

    // Validate input
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: 'clientIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates must be an object' },
        { status: 400 }
      )
    }

    // Validate that all client IDs exist
    const existingClients = await db.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true },
    })

    if (existingClients.length !== clientIds.length) {
      return NextResponse.json(
        { error: 'Some client IDs do not exist' },
        { status: 400 }
      )
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ clientId: string; error: string }>,
    }

    // Process updates in parallel for better performance
    const updatePromises = clientIds.map(async (clientId: string) => {
      try {
        const updateData: any = {}

        // Handle status update
        if (updates.status !== undefined) {
          updateData.status = updates.status
        }

        // Handle priority update
        if (updates.priority !== undefined) {
          updateData.priority = updates.priority || null
        }

        // Handle defaultCadence update
        if (updates.defaultCadence !== undefined) {
          updateData.defaultCadence = updates.defaultCadence
        }

        // Update client fields
        if (Object.keys(updateData).length > 0) {
          await db.client.update({
            where: { id: clientId },
            data: updateData,
          })
        }

        // Handle teams - add/remove logic
        if (updates.teams !== undefined) {
          const { add, remove } = updates.teams

          // Remove teams if specified
          if (remove && Array.isArray(remove) && remove.length > 0) {
            await (db as any).clientTeam.deleteMany({
              where: {
                clientId,
                teamId: { in: remove },
              },
            })
          }

          // Add teams if specified
          if (add && Array.isArray(add) && add.length > 0) {
            // Validate that all team IDs exist
            const existingTeams = await db.team.findMany({
              where: {
                id: { in: add },
                isActive: true,
              },
              select: { id: true },
            })

            const validTeamIds = existingTeams.map(t => t.id)

            if (validTeamIds.length > 0) {
              // Get existing team assignments to avoid duplicates
              const existingAssignments = await (db as any).clientTeam.findMany({
                where: { clientId },
                select: { teamId: true },
              })

              const existingTeamIds = new Set(existingAssignments.map((a: any) => a.teamId))
              const teamsToAdd = validTeamIds.filter(teamId => !existingTeamIds.has(teamId))

              if (teamsToAdd.length > 0) {
                const clientTeamsToCreate = teamsToAdd.map(teamId => ({
                  id: crypto.randomUUID(),
                  clientId,
                  teamId,
                }))

                await (db as any).clientTeam.createMany({
                  data: clientTeamsToCreate,
                  skipDuplicates: true,
                })
              }
            }
          }
        }

        // Invalidate cache for this client
        await invalidateClientCache(clientId)

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push({
          clientId,
          error: error.message || 'Unknown error',
        })
      }
    })

    await Promise.all(updatePromises)

    return NextResponse.json({
      total: clientIds.length,
      ...results,
    })
  } catch (error: any) {
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update clients' },
      { status: 500 }
    )
  }
}

