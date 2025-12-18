import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/clients/[id]/access-reviews - Get all access reviews for a client
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
    const reviews = await db.accessReview.findMany({
      where: { clientId: params.id },
      include: {
        AssignedTo: {
          select: { id: true, name: true, email: true },
        },
        CompletedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { reviewDate: 'desc' },
    })

    return NextResponse.json(reviews)
  } catch (error: any) {
    console.error('Error fetching access reviews:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/access-reviews - Schedule new access review
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
    const {
      framework,
      reviewDate,
      dueDate,
      cadence,
      customDays,
      assignedToId,
      autoSchedule,
    } = body

    if (!reviewDate || !dueDate || !cadence) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify client exists
    const client = await db.client.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const review = await db.accessReview.create({
      data: {
        id: crypto.randomUUID(),
        clientId: params.id,
        framework: framework || null,
        reviewDate: new Date(reviewDate),
        dueDate: new Date(dueDate),
        cadence,
        customDays: customDays ? parseInt(customDays) : null,
        status: 'SCHEDULED',
        assignedToId: assignedToId || null,
        autoSchedule: autoSchedule !== false, // Default to true
      },
      include: {
        AssignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(review)
  } catch (error: any) {
    console.error('Error creating access review:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

