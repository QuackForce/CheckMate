import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// POST /api/users/[id]/merge - Merge another user into this one (admin only)
// This transfers Notion link from sourceUserId to the target user
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(
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

    const body = await request.json()
    const { sourceUserId } = body
    const targetUserId = params.id

    if (!sourceUserId) {
      return NextResponse.json(
        { error: 'sourceUserId is required' },
        { status: 400 }
      )
    }

    if (sourceUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot merge a user with themselves' },
        { status: 400 }
      )
    }

    // Get both users
    const [sourceUser, targetUser] = await Promise.all([
      db.user.findUnique({ where: { id: sourceUserId } }),
      db.user.findUnique({ where: { id: targetUserId } }),
    ])

    if (!sourceUser) {
      return NextResponse.json(
        { error: 'Source user not found' },
        { status: 404 }
      )
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Prevent merging into the current admin
    if (session.user.id === sourceUserId) {
      return NextResponse.json(
        { error: 'Cannot merge your own account into another' },
        { status: 400 }
      )
    }

    // Transfer Notion link from source to target (if source has it and target doesn't)
    const updateData: any = {}
    
    if (sourceUser.notionTeamMemberId && !targetUser.notionTeamMemberId) {
      updateData.notionTeamMemberId = sourceUser.notionTeamMemberId
      updateData.notionTeamMemberName = sourceUser.notionTeamMemberName
    }

    // Use transaction to ensure data integrity
    await db.$transaction(async (tx) => {
      // Update target user with Notion data
      if (Object.keys(updateData).length > 0) {
        await tx.user.update({
          where: { id: targetUserId },
          data: updateData,
        })
      }

      // Transfer any relations from source to target
      // Note: This depends on what relations exist - adding common ones
      
      // Transfer client primary/secondary engineer assignments
      await tx.client.updateMany({
        where: { primaryEngineerId: sourceUserId },
        data: { primaryEngineerId: targetUserId },
      })

      await tx.client.updateMany({
        where: { secondaryEngineerId: sourceUserId },
        data: { secondaryEngineerId: targetUserId },
      })

      // Transfer assigned checks
      await tx.infraCheck.updateMany({
        where: { assignedEngineerId: sourceUserId },
        data: { assignedEngineerId: targetUserId },
      })

      // Transfer completed checks
      await tx.infraCheck.updateMany({
        where: { completedById: sourceUserId },
        data: { completedById: targetUserId },
      })

      // Transfer check comments (authorId is the relation field in schema)
      await tx.checkComment.updateMany({
        where: { authorId: sourceUserId },
        data: { authorId: targetUserId },
      })

      // Transfer timer sessions
      await tx.timerSession.updateMany({
        where: { userId: sourceUserId },
        data: { userId: targetUserId },
      })

      // Delete accounts and sessions for source user first (they depend on user)
      await tx.session.deleteMany({
        where: { userId: sourceUserId },
      })
      
      await tx.account.deleteMany({
        where: { userId: sourceUserId },
      })

      // Finally delete the source user
      await tx.user.delete({
        where: { id: sourceUserId },
      })
    })

    // Get updated target user
    const mergedUser = await db.user.findUnique({
      where: { id: targetUserId },
    })

    return NextResponse.json({
      success: true,
      user: mergedUser,
      message: `Merged ${sourceUser.name || sourceUser.email} into ${targetUser.name || targetUser.email}`,
    })
  } catch (error: any) {
    console.error('Error merging users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

