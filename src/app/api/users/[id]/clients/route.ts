import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// POST /api/users/[id]/clients - Attach clients to this user based on Notion/system engineer name
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    // Admin only for now (we could relax this later to allow self-service)
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const userId = params.id
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        notionTeamMemberName: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const matchName = (user.notionTeamMemberName || user.name || '').trim()
    if (!matchName) {
      return NextResponse.json(
        { error: 'User has no name/notionTeamMemberName to match on' },
        { status: 400 }
      )
    }

    // Attach clients where this person is the System Engineer in Notion
    // and there is no primaryEngineerId yet (or it's pointing at a different user)
    const primaryResult = await db.client.updateMany({
      where: {
        // Many of your SE names in Notion look like "Michael Lemay (TL - SE)"
        // while the user name is "Michael Lemay". Use a contains match.
        systemEngineerName: {
          contains: matchName,
          mode: 'insensitive',
        },
        OR: [
          { primaryEngineerId: null },
          { primaryEngineerId: { not: userId } },
        ],
      },
      data: {
        primaryEngineerId: userId,
      },
    })

    // Optionally also attach as secondary where their name appears in secondaryConsultantNames
    const secondaryResult = await db.client.updateMany({
      where: {
        secondaryEngineerId: null,
        secondaryConsultantNames: {
          has: matchName,
        },
      },
      data: {
        secondaryEngineerId: userId,
      },
    })

    return NextResponse.json({
      success: true,
      userId,
      matchName,
      primaryAttached: primaryResult.count,
      secondaryAttached: secondaryResult.count,
    })
  } catch (error: any) {
    console.error('Error attaching clients to user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


