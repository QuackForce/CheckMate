import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/systems/[id]/items - Add a check item to a system
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { text, description, isOptional } = body

    // Get the current max order for this system's items
    const maxOrder = await db.systemCheckItem.aggregate({
      where: { systemId: params.id },
      _max: { order: true },
    })

    const checkItem = await db.systemCheckItem.create({
      data: {
        systemId: params.id,
        text,
        description,
        isOptional: isOptional || false,
        order: (maxOrder._max.order || 0) + 1,
      },
    })

    return NextResponse.json(checkItem)
  } catch (error: any) {
    console.error('Error creating check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}




