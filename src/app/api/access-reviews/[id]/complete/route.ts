import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/access-reviews/[id]/complete - Mark access review as completed
export async function POST(
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
    const { evidenceUrl, notes, autoSchedule } = body

    const review = await db.accessReview.findUnique({
      where: { id: params.id },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Update review to completed
    const updatedReview = await db.accessReview.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        completedById: session.user.id,
        completedAt: new Date(),
        evidenceUrl: evidenceUrl || review.evidenceUrl,
        notes: notes !== undefined ? notes : review.notes,
        autoSchedule: autoSchedule !== undefined ? autoSchedule : review.autoSchedule,
      },
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

    // Create audit log entry
    await db.accessReviewAuditLog.create({
      data: {
        id: crypto.randomUUID(),
        reviewId: params.id,
        action: 'COMPLETED',
        userId: session.user.id,
        notes: 'Review marked as completed',
      },
    })

    // Auto-schedule next review if enabled
    let nextReview = null
    if (autoSchedule !== false && updatedReview.autoSchedule) {
      const nextDate = new Date(updatedReview.reviewDate)
      
      // Calculate next date based on cadence
      if (updatedReview.cadence === 'QUARTERLY') {
        nextDate.setMonth(nextDate.getMonth() + 3)
      } else if (updatedReview.cadence === 'SEMI_ANNUAL') {
        nextDate.setMonth(nextDate.getMonth() + 6)
      } else if (updatedReview.cadence === 'ANNUAL') {
        nextDate.setFullYear(nextDate.getFullYear() + 1)
      } else if (updatedReview.cadence === 'CUSTOM' && updatedReview.customDays) {
        nextDate.setDate(nextDate.getDate() + updatedReview.customDays)
      }

      const nextDueDate = new Date(nextDate)
      nextDueDate.setDate(nextDueDate.getDate() + 7) // Due date is 7 days after review date

      nextReview = await db.accessReview.create({
        data: {
          id: crypto.randomUUID(),
          clientId: updatedReview.clientId,
          framework: updatedReview.framework,
          reviewDate: nextDate,
          dueDate: nextDueDate,
          cadence: updatedReview.cadence,
          customDays: updatedReview.customDays,
          status: 'SCHEDULED',
          assignedToId: updatedReview.assignedToId,
          autoSchedule: updatedReview.autoSchedule,
        },
        include: {
          AssignedTo: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Log the auto-scheduling
      await db.accessReviewAuditLog.create({
        data: {
          id: crypto.randomUUID(),
          reviewId: nextReview.id,
          action: 'CREATED',
          userId: session.user.id,
          notes: `Auto-scheduled from completed review ${params.id}`,
        },
      })
    }

    return NextResponse.json({
      review: updatedReview,
      nextReview,
    })
  } catch (error: any) {
    console.error('Error completing access review:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

