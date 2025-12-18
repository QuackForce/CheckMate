import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/compliance/access-reviews - Get all access reviews across all clients
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
    const assigneeMe = searchParams.get('assignee') === 'me'
    const userId = session.user.id

    // Get client IDs for "My Clients" filter
    let clientIds: string[] | null = null
    if (assigneeMe) {
      const assignments = await db.clientEngineerAssignment.findMany({
        where: { userId },
        select: { clientId: true },
      })
      clientIds = assignments.map(a => a.clientId)
    }

    const where = clientIds 
      ? { clientId: { in: clientIds } }
      : {}

    const reviews = await db.accessReview.findMany({
      where,
      include: {
        Client: {
          select: { id: true, name: true },
        },
        AssignedTo: {
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

