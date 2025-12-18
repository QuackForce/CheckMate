import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/audit-types/[id] - Get a single audit type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const auditType = await db.auditType.findUnique({
      where: { id: params.id },
      include: {
        Framework: {
          select: { id: true, name: true },
        },
      },
    })

    if (!auditType) {
      return NextResponse.json({ error: 'Audit type not found' }, { status: 404 })
    }

    return NextResponse.json(auditType)
  } catch (error: any) {
    console.error('Error fetching audit type:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/audit-types/[id] - Update an audit type
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, description, isActive, order } = body

    const auditType = await db.auditType.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(order !== undefined && { order }),
      },
      include: {
        Framework: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(auditType)
  } catch (error: any) {
    console.error('Error updating audit type:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/audit-types/[id] - Delete an audit type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    await db.auditType.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting audit type:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

