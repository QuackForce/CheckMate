import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'

// GET /api/users/[id] - Get a single user
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await db.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            InfraCheck_InfraCheck_assignedEngineerIdToUser: true,
            InfraCheck_InfraCheck_completedByIdToUser: true,
            Client_Client_primaryEngineerIdToUser: true,
            Client_Client_secondaryEngineerIdToUser: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get role breakdown from ClientEngineerAssignment
    const roleAssignments = await db.clientEngineerAssignment.groupBy({
      by: ['role'],
      where: { userId: params.id },
      _count: { id: true },
    })

    // Get all assignments to calculate total unique clients
    // Now using only ClientEngineerAssignment table (legacy fields migrated)
    const allAssignments = await db.clientEngineerAssignment.findMany({
      where: { userId: params.id },
      select: { clientId: true },
    })

    // Also include infra check assignments for total count
    const infraCheckAssignments = await db.infraCheck.findMany({
      where: { assignedEngineerId: params.id },
      select: { clientId: true },
    })

    // Calculate total unique clients (combining assignment table and infra checks)
    // Legacy fields no longer needed - all data migrated to ClientEngineerAssignment
    const uniqueClientIds = new Set<string>()
    allAssignments.forEach(a => uniqueClientIds.add(a.clientId))
    infraCheckAssignments.forEach(ic => {
      if (ic.clientId) uniqueClientIds.add(ic.clientId)
    })

    // Convert to a simple object with role counts
    // All roles now come from ClientEngineerAssignment (legacy fields migrated)
    const roleBreakdown: Record<string, number> = {}
    roleAssignments.forEach((assignment) => {
      roleBreakdown[assignment.role] = assignment._count.id
    })

    // Get user's teams
    const userTeams = await (db as any).userTeam.findMany({
      where: { userId: params.id },
      include: {
        Team: {
          select: {
            id: true,
            name: true,
            color: true,
            description: true,
          },
        },
      },
    })

    // Get client assignments with client details
    const clientAssignments = await db.clientEngineerAssignment.findMany({
      where: { userId: params.id },
      include: {
        Client: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [
        { Client: { name: 'asc' } },
        { role: 'asc' },
      ],
    })

    // Group by client (a user can have multiple roles for the same client)
    const clientsByRole = new Map<string, Array<{ role: string; clientId: string; clientName: string; clientStatus: string }>>()
    clientAssignments.forEach((assignment: any) => {
      if (assignment.Client) {
        const clientId = assignment.Client.id
        if (!clientsByRole.has(clientId)) {
          clientsByRole.set(clientId, [])
        }
        clientsByRole.get(clientId)!.push({
          role: assignment.role,
          clientId: assignment.Client.id,
          clientName: assignment.Client.name,
          clientStatus: assignment.Client.status,
        })
      }
    })

    // Convert to array format
    const clientAssignmentsList = Array.from(clientsByRole.entries()).map(([clientId, roles]) => ({
      clientId,
      clientName: roles[0].clientName,
      clientStatus: roles[0].clientStatus,
      roles: roles.map(r => r.role),
    }))

    return NextResponse.json({
      ...user,
      roleBreakdown,
      totalUniqueClients: uniqueClientIds.size,
      teams: userTeams.map((ut: any) => ut.Team),
      clientAssignments: clientAssignmentsList,
    })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/users/[id] - Update a user (admin only)
// Force dynamic rendering for this route

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, session } = await requireAdmin()
    if (error) return error
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const body = await request.json()
    const updateData: any = {}

    // Manager can be updated by any authenticated user (but not to self)
    if (body.managerId !== undefined) {
      if (body.managerId === params.id) {
        return NextResponse.json({ error: 'User cannot be their own manager' }, { status: 400 })
      }
      updateData.managerId = body.managerId || null
    }

    // Admin-only fields
    if (isAdmin) {
      const allowedAdminFields = [
        'name',
        'email',
        'role',
        'notionTeamMemberId',
        'notionTeamMemberName',
        'slackUsername',
        'slackUserId',
        'jobTitle',
        'team', // Legacy field - kept for backward compatibility
      ]
      for (const field of allowedAdminFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field]
        }
      }

      // Handle unlinking from Notion
      if (body.notionTeamMemberId === null) {
        updateData.notionTeamMemberId = null
        updateData.notionTeamMemberName = null
      }
    } else {
      // If non-admin tries to update other fields, block
      const nonManagerFields = Object.keys(body).filter((k) => k !== 'managerId' && k !== 'teamIds')
      if (nonManagerFields.length > 0) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
      }
    }

    // Handle team associations (teamIds array)
    if (body.teamIds !== undefined) {
      const teamIds = body.teamIds as string[]

      // Delete existing user team associations
      await (db as any).userTeam.deleteMany({
        where: { userId: params.id },
      })

      // Create new user team associations if teamIds provided
      if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
        // Validate that all team IDs exist
        const existingTeams = await (db as any).team.findMany({
          where: { 
            id: { in: teamIds },
            isActive: true,
          },
          select: { id: true },
        })

        const validTeamIds = existingTeams.map((t: any) => t.id)
        
        if (validTeamIds.length > 0) {
          const userTeamsToCreate = validTeamIds.map((teamId: string) => ({
            userId: params.id,
            teamId,
          }))

          await (db as any).userTeam.createMany({
            data: userTeamsToCreate,
            skipDuplicates: true,
          })
        }
      }
    }

    if (Object.keys(updateData).length === 0 && body.teamIds === undefined && body.managerId === undefined) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Delete a user (admin only)
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error, session } = await requireAdmin()
    if (error) return error

    // Prevent deleting yourself
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await db.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

