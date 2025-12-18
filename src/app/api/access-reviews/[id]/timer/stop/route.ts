import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/access-reviews/[id]/timer/stop - Stop timer for access review
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    // Find active timer session
    const activeSession = await db.accessReviewTimerSession.findFirst({
      where: {
        reviewId: params.id,
        endTime: null,
      },
    })

    if (!activeSession) {
      return NextResponse.json(
        { error: 'No active timer session found' },
        { status: 400 }
      )
    }

    // Stop the timer
    const endTime = new Date()
    const durationSeconds = Math.floor((endTime.getTime() - activeSession.startTime.getTime()) / 1000)

    await db.accessReviewTimerSession.update({
      where: { id: activeSession.id },
      data: {
        endTime,
        durationSeconds,
      },
    })

    // Update total time on review
    const review = await db.accessReview.findUnique({
      where: { id: params.id },
      select: { totalTimeSeconds: true },
    })

    const newTotalTime = (review?.totalTimeSeconds || 0) + durationSeconds

    await db.accessReview.update({
      where: { id: params.id },
      data: {
        totalTimeSeconds: newTotalTime,
      },
    })

    return NextResponse.json({
      success: true,
      durationSeconds,
      totalTimeSeconds: newTotalTime,
    })
  } catch (error: any) {
    console.error('Error stopping timer:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

