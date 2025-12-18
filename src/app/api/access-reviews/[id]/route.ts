import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/access-reviews/[id] - Get single access review
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
    const review = await db.accessReview.findUnique({
      where: { id: params.id },
      include: {
        Client: {
          select: { id: true, name: true },
        },
        AssignedTo: {
          select: { id: true, name: true, email: true },
        },
        CompletedBy: {
          select: { id: true, name: true, email: true },
        },
        AuditLog: {
          include: {
            User: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        TimerSession: {
          include: {
            User: {
              select: { id: true, name: true },
            },
          },
          orderBy: { startTime: 'desc' },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json(review)
  } catch (error: any) {
    console.error('Error fetching access review:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PATCH /api/access-reviews/[id] - Update access review
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions: IT_ENGINEER, IT_MANAGER, or ADMIN
  const userRole = session.user.role
  const canManage = userRole === 'IT_ENGINEER' || userRole === 'IT_MANAGER' || userRole === 'ADMIN'
  
  if (!canManage) {
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
    const updateData: any = {}

    // Only update fields that are provided
    if (body.framework !== undefined) updateData.framework = body.framework
    if (body.reviewDate !== undefined) updateData.reviewDate = new Date(body.reviewDate)
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate)
    if (body.cadence !== undefined) updateData.cadence = body.cadence
    if (body.customDays !== undefined) updateData.customDays = body.customDays ? parseInt(body.customDays) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId
    if (body.evidenceUrl !== undefined) updateData.evidenceUrl = body.evidenceUrl
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.totalTimeSeconds !== undefined) updateData.totalTimeSeconds = parseInt(body.totalTimeSeconds)
    if (body.autoSchedule !== undefined) updateData.autoSchedule = body.autoSchedule

    // Create audit log entry for changes
    if (Object.keys(updateData).length > 0) {
      const oldReview = await db.accessReview.findUnique({
        where: { id: params.id },
      })

      // Log each field change
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field === 'updatedAt' || field === 'updatedById') continue
        
        const oldValue = oldReview ? (oldReview as any)[field] : null
        
        await db.accessReviewAuditLog.create({
          data: {
            id: crypto.randomUUID(),
            reviewId: params.id,
            action: 'UPDATED',
            field,
            oldValue: oldValue?.toString() || null,
            newValue: newValue?.toString() || null,
            userId: session.user.id,
          },
        })
      }
    }

    const review = await db.accessReview.update({
      where: { id: params.id },
      data: updateData,
      include: {
        Client: {
          select: { id: true, name: true },
        },
        AssignedTo: {
          select: { id: true, name: true, email: true },
        },
        CompletedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(review)
  } catch (error: any) {
    console.error('Error updating access review:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/access-reviews/[id] - Delete access review
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions: IT_ENGINEER, IT_MANAGER, or ADMIN
  const userRole = session.user.role
  const canManage = userRole === 'IT_ENGINEER' || userRole === 'IT_MANAGER' || userRole === 'ADMIN'
  
  if (!canManage) {
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
    await db.accessReview.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting access review:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

