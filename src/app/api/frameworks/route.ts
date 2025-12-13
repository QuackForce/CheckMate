import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/frameworks - Get all frameworks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: any = {}
    if (category) where.category = category
    if (activeOnly) where.isActive = true

    const frameworks = await db.framework.findMany({
      where,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(frameworks)
  } catch (error: any) {
    console.error('Error fetching frameworks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/frameworks - Create a new framework
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
    const { name, category, description, source } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    const framework = await db.framework.create({
      data: {
        name,
        category,
        description,
        source: source || 'APP',
      },
    })

    return NextResponse.json(framework)
  } catch (error: any) {
    console.error('Error creating framework:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}







