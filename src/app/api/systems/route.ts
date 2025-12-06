import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/systems - Get all systems
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeItems = searchParams.get('includeItems') === 'true'

    const where = category ? { category: category as any } : {}

    const systems = await db.system.findMany({
      where: {
        ...where,
        isActive: true,
      },
      include: includeItems ? { checkItems: { orderBy: { order: 'asc' } } } : undefined,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(systems)
  } catch (error: any) {
    console.error('Error fetching systems:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/systems - Create a new system
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category, icon, description, source, checkItems } = body

    const system = await db.system.create({
      data: {
        name,
        category,
        icon,
        description,
        source: source || 'APP',
        checkItems: checkItems
          ? {
              create: checkItems.map((item: any, index: number) => ({
                text: item.text,
                description: item.description,
                isOptional: item.isOptional || false,
                order: index,
              })),
            }
          : undefined,
      },
      include: { checkItems: true },
    })

    return NextResponse.json(system)
  } catch (error: any) {
    console.error('Error creating system:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

