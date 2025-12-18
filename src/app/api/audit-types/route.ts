import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/audit-types - Get audit types, optionally filtered by framework
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identifier = getIdentifier(session.user.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.RELAXED)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const frameworkId = searchParams.get('frameworkId')
    const frameworkName = searchParams.get('frameworkName')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: any = {}
    if (frameworkId) {
      where.frameworkId = frameworkId
    } else if (frameworkName) {
      // Find framework by name first
      const framework = await db.framework.findUnique({
        where: { name: frameworkName },
        select: { id: true },
      })
      if (framework) {
        where.frameworkId = framework.id
      } else {
        return NextResponse.json([])
      }
    }
    if (activeOnly) {
      where.isActive = true
    }

    const auditTypes = await db.auditType.findMany({
      where,
      include: {
        Framework: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(auditTypes)
  } catch (error: any) {
    console.error('Error fetching audit types:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/audit-types - Create a new audit type
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasPermission(session.user.role, 'settings:edit')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const identifier = getIdentifier(session.user.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()
    const { frameworkId, name, description, order } = body

    if (!frameworkId || !name) {
      return NextResponse.json(
        { error: 'Framework ID and name are required' },
        { status: 400 }
      )
    }

    // Verify framework exists
    const framework = await db.framework.findUnique({
      where: { id: frameworkId },
      select: { id: true },
    })

    if (!framework) {
      return NextResponse.json({ error: 'Framework not found' }, { status: 404 })
    }

    const auditType = await db.auditType.create({
      data: {
        id: crypto.randomUUID(),
        frameworkId,
        name,
        description: description || null,
        order: order || 0,
      },
      include: {
        Framework: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(auditType)
  } catch (error: any) {
    console.error('Error creating audit type:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

