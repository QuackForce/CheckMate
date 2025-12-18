import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// POST /api/access-reviews/[id]/timer/start - Start timer for access review
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
    // Check if there's already an active timer session
    const activeSession = await db.accessReviewTimerSession.findFirst({
      where: {
        reviewId: params.id,
        endTime: null,
      },
    })

    if (activeSession) {
      return NextResponse.json({
        sessionId: activeSession.id,
        message: 'Timer already running',
      })
    }

    // Create new timer session
    const timerSession = await db.accessReviewTimerSession.create({
      data: {
        id: crypto.randomUUID(),
        reviewId: params.id,
        userId: session.user.id,
        startTime: new Date(),
      },
    })

    return NextResponse.json({
      sessionId: timerSession.id,
      startTime: timerSession.startTime,
    })
  } catch (error: any) {
    console.error('Error starting timer:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

