import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/systems/[id] - Get a single system
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const system = await db.system.findUnique({
      where: { id: params.id },
      include: { checkItems: { orderBy: { order: 'asc' } } },
    })

    if (!system) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    return NextResponse.json(system)
  } catch (error: any) {
    console.error('Error fetching system:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/systems/[id] - Update a system
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, category, icon, description, isActive } = body

    const system = await db.system.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(icon !== undefined && { icon }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { checkItems: true },
    })

    return NextResponse.json(system)
  } catch (error: any) {
    console.error('Error updating system:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/systems/[id] - Delete a system
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First remove from all clients
    await db.clientSystem.deleteMany({
      where: { systemId: params.id },
    })

    // Then delete the system (cascade will delete check items)
    await db.system.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting system:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

