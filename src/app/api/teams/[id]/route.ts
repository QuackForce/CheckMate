import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeamManager } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// GET /api/teams/[id] - Get a single team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const teamModel = (db as any).team
    if (!teamModel || typeof teamModel.findUnique !== 'function') {
      return NextResponse.json(
        { error: 'Team model not available. Please restart the dev server.' },
        { status: 500 }
      )
    }

    const team = await teamModel.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                jobTitle: true,
              },
            },
          },
        },
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Fetch clients associated with this team
    let clients: any[] = []
    try {
      const clientTeams = await (db as any).clientTeam.findMany({
        where: { teamId: params.id },
        include: {
          Client: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      })
      clients = clientTeams.map((ct: any) => ({
        id: ct.client.id,
        name: ct.client.name,
        status: ct.client.status,
        clientTeamId: ct.id, // Include the join table ID for removal
      }))
    } catch (error) {
      // If ClientTeam table doesn't exist yet, clients will be empty
      console.error('Error fetching team clients:', error)
    }

    // Transform the response to include users array
    const teamWithUsers = {
      ...team,
      members: team.users.map((ut: any) => ut.user),
      clients,
    }

    return NextResponse.json(teamWithUsers)
  } catch (error: any) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch team' },
      { status: 500 }
    )
  }
}

// PATCH /api/teams/[id] - Update a team
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireTeamManager()
    if (error) return error

    const body = await request.json()
    const { name, description, color, tag, managerId, isActive } = body

    // Check if team exists
    const existing = await db.team.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // If name is being changed, check for conflicts
    if (name && name.trim() !== existing.name) {
      const nameConflict = await db.team.findUnique({
        where: { name: name.trim() },
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'A team with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Update team
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color?.trim() || null
    if (tag !== undefined) updateData.tag = tag?.trim() || null
    if (managerId !== undefined) updateData.managerId = managerId || null
    if (isActive !== undefined) updateData.isActive = isActive

    const teamModel = (db as any).team
    if (!teamModel || typeof teamModel.update !== 'function') {
      return NextResponse.json(
        { error: 'Team model not available. Please restart the dev server.' },
        { status: 500 }
      )
    }

    const team = await teamModel.update({
      where: { id: params.id },
      data: updateData,
    })

    // Handle team member updates if provided
    if (body.userIds !== undefined) {
      const userIds = body.userIds as string[]

      // Delete existing user team associations
      await (db as any).userTeam.deleteMany({
        where: { teamId: params.id },
      })

      // Create new user team associations if userIds provided
      if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Validate that all user IDs exist
        const existingUsers = await db.user.findMany({
          where: { 
            id: { in: userIds },
          },
          select: { id: true },
        })

        const validUserIds = existingUsers.map(u => u.id)
        
        if (validUserIds.length > 0) {
          const userTeamsToCreate = validUserIds.map(userId => ({
            userId,
            teamId: params.id,
          }))

          await (db as any).userTeam.createMany({
            data: userTeamsToCreate,
            skipDuplicates: true,
          })
        }
      }
    }

    // Fetch updated team with members and clients
    const updatedTeam = await teamModel.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
        users: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                jobTitle: true,
              },
            },
          },
        },
      },
    })

    // Fetch clients associated with this team
    let clients: any[] = []
    try {
      const clientTeams = await (db as any).clientTeam.findMany({
        where: { teamId: params.id },
        include: {
          Client: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      })
      clients = clientTeams.map((ct: any) => ({
        id: ct.client.id,
        name: ct.client.name,
        status: ct.client.status,
        clientTeamId: ct.id,
      }))
    } catch (error) {
      console.error('Error fetching team clients:', error)
    }

    const teamWithUsers = {
      ...updatedTeam,
      members: updatedTeam?.users.map((ut: any) => ut.user) || [],
      clients,
    }

    return NextResponse.json(teamWithUsers)
  } catch (error: any) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update team' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams/[id] - Delete a team (soft delete by setting isActive to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireTeamManager()
    if (error) return error

    // Check if team exists
    const existing = await db.team.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    // Don't hard delete to preserve relationships
    const teamModel = (db as any).team
    if (!teamModel || typeof teamModel.update !== 'function') {
      return NextResponse.json(
        { error: 'Team model not available. Please restart the dev server.' },
        { status: 500 }
      )
    }

    const team = await teamModel.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, team })
  } catch (error: any) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete team' },
      { status: 500 }
    )
  }
}

