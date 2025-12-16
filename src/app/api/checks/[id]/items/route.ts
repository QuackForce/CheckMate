import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer } from '@/lib/auth-utils'

// POST /api/checks/[id]/items - Add a new check item to a category
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireEngineer()
  if (authError) return authError

  try {
    const body = await request.json()
    const { categoryId, text, isOptional } = body

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }
    if (!text) {
      return NextResponse.json({ error: 'Item text is required' }, { status: 400 })
    }

    // Verify the category belongs to this check
    const category = await db.categoryResult.findFirst({
      where: {
        id: categoryId,
        checkId: params.id,
      },
      include: {
        ItemResult: true,
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Get the next order number
    const nextOrder = category.ItemResult.length

    // Create the new item
    const item = await db.itemResult.create({
      data: {
        id: crypto.randomUUID(),
        categoryResultId: categoryId,
        text,
        checked: false,
        order: nextOrder,
        notes: isOptional ? '(Custom item)' : null,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      item,
      message: 'Item added successfully',
    })
  } catch (error: any) {
    console.error('Error adding check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

