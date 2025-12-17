import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

// GET /api/systems - Get all systems
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

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
      include: includeItems ? { SystemCheckItem: { orderBy: { order: 'asc' } } } : undefined,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(systems)
  } catch (error: any) {
    console.error('Error fetching systems:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/systems - Create a new system
// Force dynamic rendering for this route

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'settings:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, category, icon, description, source, checkItems } = body

    const system = await db.system.create({
      data: {
        id: crypto.randomUUID(),
        name,
        category,
        icon,
        description,
        source: source || 'APP',
        updatedAt: new Date(),
        SystemCheckItem: checkItems
          ? {
              create: checkItems.map((item: any, index: number) => ({
                id: crypto.randomUUID(),
                text: item.text,
                description: item.description,
                isOptional: item.isOptional || false,
                order: index,
                updatedAt: new Date(),
              })),
            }
          : undefined,
      },
      include: { SystemCheckItem: true },
    })

    return NextResponse.json(system)
  } catch (error: any) {
    console.error('Error creating system:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

