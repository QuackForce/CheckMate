import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

// PATCH /api/systems/[id]/items/[itemId] - Update a check item
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'settings:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { text, description, isOptional, order } = body

    const checkItem = await db.systemCheckItem.update({
      where: { id: params.itemId },
      data: {
        ...(text !== undefined && { text }),
        ...(description !== undefined && { description }),
        ...(isOptional !== undefined && { isOptional }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(checkItem)
  } catch (error: any) {
    console.error('Error updating check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/systems/[id]/items/[itemId] - Delete a check item
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'settings:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.systemCheckItem.delete({
      where: { id: params.itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}








