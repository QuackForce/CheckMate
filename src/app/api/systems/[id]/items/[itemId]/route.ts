import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PATCH /api/systems/[id]/items/[itemId] - Update a check item
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
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
    await db.systemCheckItem.delete({
      where: { id: params.itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


