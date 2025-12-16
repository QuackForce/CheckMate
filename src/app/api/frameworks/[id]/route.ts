import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/frameworks/[id] - Get a single framework
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const framework = await db.framework.findUnique({
      where: { id: params.id },
    })

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 })
    }

    return NextResponse.json(framework)
  } catch (error: any) {
    console.error('Error fetching framework:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/frameworks/[id] - Update a framework
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { name, category, description, isActive, order } = body

    const framework = await db.framework.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json(framework)
  } catch (error: any) {
    console.error('Error updating framework:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/frameworks/[id] - Delete a framework
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'settings:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.framework.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting framework:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}








