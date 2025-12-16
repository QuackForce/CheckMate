import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me/preferences
 * 
 * Get the current user's notification preferences
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      timezone: true,
      notifySlackReminders: true,
      notifyOverdueChecks: true,
      notifyWeeklySummary: true,
      slackUsername: true,
      slackUserId: true,
      jobTitle: true,
      team: true,
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          jobTitle: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

/**
 * PATCH /api/users/me/preferences
 * 
 * Update the current user's notification preferences
 */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Only allow updating specific fields
    const booleanFields = ['notifySlackReminders', 'notifyOverdueChecks', 'notifyWeeklySummary']
    const stringFields = ['timezone']
    const updates: Record<string, boolean | string> = {}

    for (const field of booleanFields) {
      if (typeof body[field] === 'boolean') {
        updates[field] = body[field]
      }
    }

    for (const field of stringFields) {
      if (typeof body[field] === 'string' && body[field].length > 0) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updates,
      select: {
        timezone: true,
        notifySlackReminders: true,
        notifyOverdueChecks: true,
        notifyWeeklySummary: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    )
  }
}


