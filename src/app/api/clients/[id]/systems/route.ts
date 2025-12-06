import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/clients/[id]/systems - Get systems assigned to a client
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientSystems = await db.clientSystem.findMany({
      where: {
        clientId: params.id,
        isActive: true,
      },
      include: {
        system: {
          include: {
            checkItems: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: {
        system: { category: 'asc' },
      },
    })

    return NextResponse.json(clientSystems)
  } catch (error: any) {
    console.error('Error fetching client systems:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/clients/[id]/systems - Add a system to a client
// Force dynamic rendering for this route

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { systemId, notes } = body

    // Check if already exists
    const existing = await db.clientSystem.findUnique({
      where: {
        clientId_systemId: {
          clientId: params.id,
          systemId,
        },
      },
    })

    if (existing) {
      // Reactivate if inactive
      if (!existing.isActive) {
        const updated = await db.clientSystem.update({
          where: { id: existing.id },
          data: { isActive: true, notes },
          include: { system: true },
        })
        return NextResponse.json(updated)
      }
      return NextResponse.json({ error: 'System already assigned' }, { status: 400 })
    }

    const clientSystem = await db.clientSystem.create({
      data: {
        clientId: params.id,
        systemId,
        notes,
      },
      include: {
        system: {
          include: { checkItems: true },
        },
      },
    })

    return NextResponse.json(clientSystem)
  } catch (error: any) {
    console.error('Error adding system to client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/clients/[id]/systems - Remove a system from a client
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const systemId = searchParams.get('systemId')

    if (!systemId) {
      return NextResponse.json({ error: 'systemId is required' }, { status: 400 })
    }

    // Soft delete by setting isActive to false
    await db.clientSystem.updateMany({
      where: {
        clientId: params.id,
        systemId,
      },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing system from client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


