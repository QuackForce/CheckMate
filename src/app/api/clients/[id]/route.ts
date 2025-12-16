import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer, requireAdmin } from '@/lib/auth-utils'
import { withCache, CACHE_KEYS, CACHE_TTL, invalidateClientCache } from '@/lib/cache'

// Use string literals for roles (Prisma enum may not be exported)
const ClientEngineerRole = {
  SE: 'SE',
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  GRCE: 'GRCE',
  IT_MANAGER: 'IT_MANAGER',
} as const

// GET /api/clients/[id] - Get a single client
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cacheKey = CACHE_KEYS.client(params.id)
    
      const client = await withCache(
      cacheKey,
      async () => {
        const clientData = await db.client.findUnique({
          where: { id: params.id },
          include: {
            primaryEngineer: {
              select: { id: true, name: true, email: true, image: true },
            },
            secondaryEngineer: {
              select: { id: true, name: true, email: true, image: true },
            },
            clientSystems: {
              where: { isActive: true },
              include: {
                system: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
            checks: {
              take: 5,
              orderBy: { scheduledDate: 'desc' },
            },
            assignments: {
              include: { user: { select: { id: true, name: true, email: true, image: true } } },
            },
          },
        })

        if (!clientData) return null

        // Fetch assignments separately (Prisma types may not include it)
        const allAssignments = await (db as any).clientEngineerAssignment.findMany({
          where: { clientId: params.id },
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: [
            { role: 'asc' },
            { user: { name: 'asc' } },
          ],
        })
        
        // Filter out orphaned assignments (where user is null - user was deleted but assignment wasn't)
        const assignments = allAssignments.filter((a: any) => a.user !== null)

        // Fetch team assignments separately (with error handling in case table doesn't exist yet)
        let teamAssignments: any[] = []
        try {
          teamAssignments = await (db as any).clientTeam.findMany({
            where: { clientId: params.id },
            select: {
              id: true,
              teamId: true,
              team: {
                select: { id: true, name: true, description: true, color: true, tag: true },
              },
            },
          })
        } catch (teamError: any) {
          // If ClientTeam table doesn't exist or there's an error, just return empty array
          console.warn('Error fetching team assignments (may not exist yet):', teamError.message)
          teamAssignments = []
        }

        return {
          ...clientData,
          assignments,
          teamAssignments,
        }
      },
      CACHE_TTL.client
    )

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Error fetching client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/clients/[id] - Update a client (Engineer+ only)
// Force dynamic rendering for this route

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireEngineer()
  if (error) return error

  try {
    const body = await request.json()
    
    // Only allow updating certain fields
    const allowedFields = [
      'name',
      'status',
      'priority',
      'slackChannelId',
      'slackChannelName',
      'defaultCadence',
      'customCadenceDays',
      'checkCadence',
      'pocEmail',
      'officeAddress',
      'hoursPerMonth',
      'itSyncsFrequency',
      'onsitesFrequency',
      'websiteUrl',
      'notes',
      // Engineer names (kept for backward compatibility)
      'systemEngineerName',
      'primaryConsultantName',
      'secondaryConsultantNames',
      'itManagerName',
      'grceEngineerName',
      // App-specific override
      'infraCheckAssigneeName',
      // Compliance
      'complianceFrameworks',
      // Integration URLs
      'itGlueUrl',
      'zendeskUrl',
      'trelloUrl',
      'onePasswordUrl',
      'sharedDriveUrl',
      'customUrls',
      // Trust Center
      'trustCenterUrl',
      'trustCenterPlatform',
    ]

    // Filter to only allowed fields
    const updateData: any = {}
    const oldInfraCheckAssigneeName = body._oldInfraCheckAssigneeName // Track old value
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Handle assignments if provided
    if (body.assignments) {
      const assignments = body.assignments as {
        SE?: string[]
        PRIMARY?: string[]
        SECONDARY?: string[]
        GRCE?: string[]
        IT_MANAGER?: string[]
      }

      // Validate: Maximum 4 assignments per role
      const MAX_ASSIGNMENTS_PER_ROLE = 4
      if (assignments.SE && assignments.SE.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} System Engineers allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.PRIMARY && assignments.PRIMARY.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} Primary Consultants allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.SECONDARY && assignments.SECONDARY.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} Secondary Consultants allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.GRCE && assignments.GRCE.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} GRCE Engineers allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.IT_MANAGER && assignments.IT_MANAGER.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} IT Managers allowed per client` },
          { status: 400 }
        )
      }

      // Delete existing assignments for this client
      await (db as any).clientEngineerAssignment.deleteMany({
        where: { clientId: params.id },
      })

      // Create new assignments
      const assignmentsToCreate: Array<{
        clientId: string
        userId: string
        role: string
      }> = []

      if (assignments.SE) {
        assignments.SE.forEach(userId => {
          assignmentsToCreate.push({
            clientId: params.id,
            userId,
            role: ClientEngineerRole.SE as string,
          })
        })
      }

      if (assignments.PRIMARY) {
        assignments.PRIMARY.forEach(userId => {
          assignmentsToCreate.push({
            clientId: params.id,
            userId,
            role: ClientEngineerRole.PRIMARY as string,
          })
        })
      }

      if (assignments.SECONDARY) {
        assignments.SECONDARY.forEach(userId => {
          assignmentsToCreate.push({
            clientId: params.id,
            userId,
            role: ClientEngineerRole.SECONDARY as string,
          })
        })
      }

      if (assignments.GRCE) {
        assignments.GRCE.forEach(userId => {
          assignmentsToCreate.push({
            clientId: params.id,
            userId,
            role: ClientEngineerRole.GRCE as string,
          })
        })
      }

      if (assignments.IT_MANAGER) {
        assignments.IT_MANAGER.forEach(userId => {
          assignmentsToCreate.push({
            clientId: params.id,
            userId,
            role: ClientEngineerRole.IT_MANAGER as string,
          })
        })
      }

      // Create all assignments
      if (assignmentsToCreate.length > 0) {
        await (db as any).clientEngineerAssignment.createMany({
          data: assignmentsToCreate,
          skipDuplicates: true,
        })
      }

      // Update name fields from assignments for backward compatibility
      // This ensures name fields stay in sync with assignments
      const allAssignments = await (db as any).clientEngineerAssignment.findMany({
        where: { clientId: params.id },
        include: { user: { select: { name: true } } },
      })

      const seUsers = (allAssignments as any[])
        .filter((a: any) => a.role === 'SE')
        .map((a: any) => a.user.name)
        .filter(Boolean)
      const primaryUsers = (allAssignments as any[])
        .filter((a: any) => a.role === 'PRIMARY')
        .map((a: any) => a.user.name)
        .filter(Boolean)
      const secondaryUsers = (allAssignments as any[])
        .filter((a: any) => a.role === 'SECONDARY')
        .map((a: any) => a.user.name)
        .filter(Boolean)
      const grceUsers = (allAssignments as any[])
        .filter((a: any) => a.role === 'GRCE')
        .map((a: any) => a.user.name)
        .filter(Boolean)
      const itManagerUsers = (allAssignments as any[])
        .filter((a: any) => a.role === 'IT_MANAGER')
        .map((a: any) => a.user.name)
        .filter(Boolean)

      // Update name fields (first name for each role, or null if none)
      // For backward compatibility, we store the first name in the single name field
      updateData.systemEngineerName = seUsers[0] || null
      updateData.primaryConsultantName = primaryUsers[0] || null
      updateData.secondaryConsultantNames = secondaryUsers
      updateData.grceEngineerName = grceUsers[0] || null
      updateData.itManagerName = itManagerUsers[0] || null
    }

    // Handle teams if provided
    if (body.teamIds !== undefined) {
      const teamIds = body.teamIds as string[]

      // Delete existing team assignments
      await (db as any).clientTeam.deleteMany({
        where: { clientId: params.id },
      })

      // Create new team assignments if teamIds provided
      if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
        // Validate that all team IDs exist
        const existingTeams = await db.team.findMany({
          where: { 
            id: { in: teamIds },
            isActive: true,
          },
          select: { id: true },
        })

        const validTeamIds = existingTeams.map(t => t.id)
        
        if (validTeamIds.length > 0) {
          const clientTeamsToCreate = validTeamIds.map(teamId => ({
            clientId: params.id,
            teamId,
          }))

          await (db as any).clientTeam.createMany({
            data: clientTeamsToCreate,
            skipDuplicates: true,
          })
        }
      }
    }

    const client = await db.client.update({
      where: { id: params.id },
      data: updateData,
    })
    
    // If infraCheckAssigneeName changed, update all incomplete checks for this client
    if (updateData.infraCheckAssigneeName !== undefined && 
        updateData.infraCheckAssigneeName !== oldInfraCheckAssigneeName) {
      const newAssigneeName = updateData.infraCheckAssigneeName || client.systemEngineerName
      
      // Update all incomplete checks (SCHEDULED, IN_PROGRESS, OVERDUE)
      await db.infraCheck.updateMany({
        where: {
          clientId: params.id,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] },
        },
        data: {
          assignedEngineerName: newAssigneeName,
          // Try to link to User if exists
          assignedEngineerId: null, // Will be set below if user found
        },
      })
      
      // Try to find and link the user
      if (newAssigneeName) {
        const assigneeUser = await db.user.findFirst({
          where: {
            OR: [
              { name: newAssigneeName },
              { name: { contains: newAssigneeName, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        })
        
        if (assigneeUser) {
          // Update checks to link to the user
          await db.infraCheck.updateMany({
            where: {
              clientId: params.id,
              status: { in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] },
            },
            data: {
              assignedEngineerId: assigneeUser.id,
            },
          })
        }
      }
    }

    // Invalidate cache when client is updated
    await invalidateClientCache(params.id)

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/clients/[id] - Delete a client (Admin only)
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    await db.client.delete({
      where: { id: params.id },
    })

    // Invalidate cache when client is deleted
    await invalidateClientCache(params.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

