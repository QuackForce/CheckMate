import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

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
            assignedChecks: true,
            completedChecks: true,
            primaryClients: true,
            secondaryClients: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
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
    const session = await auth()
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
        'team',
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
      const nonManagerFields = Object.keys(body).filter((k) => k !== 'managerId')
      if (nonManagerFields.length > 0) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
      }
    }

    if (Object.keys(updateData).length === 0) {
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
    const session = await auth()
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

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
