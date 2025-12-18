import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/compliance/stats - Get compliance statistics
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Audit stats
    const auditWhere = clientIds 
      ? { clientId: { in: clientIds } }
      : {}

    const allAudits = await db.complianceAudit.findMany({
      where: auditWhere,
    })

    const totalAudits = allAudits.length
    const overdueAudits = allAudits.filter(audit => {
      if (audit.status === 'COMPLETED') return false
      const dueDate = new Date(audit.nextAuditDue)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length

    const upcomingAudits = allAudits.filter(audit => {
      if (audit.status === 'COMPLETED') return false
      const dueDate = new Date(audit.nextAuditDue)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate >= today
    }).length

    // Review stats
    const reviewWhere = clientIds
      ? { clientId: { in: clientIds } }
      : {}

    const allReviews = await db.accessReview.findMany({
      where: reviewWhere,
    })

    const totalReviews = allReviews.length
    const overdueReviews = allReviews.filter(review => {
      if (review.status === 'COMPLETED') return false
      const dueDate = new Date(review.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length

    const inProgressReviews = allReviews.filter(review => 
      review.status === 'IN_PROGRESS'
    ).length

    const completedReviews = allReviews.filter(review => 
      review.status === 'COMPLETED'
    ).length

    return NextResponse.json({
      totalAudits,
      overdueAudits,
      upcomingAudits,
      totalReviews,
      overdueReviews,
      inProgressReviews,
      completedReviews,
    })
  } catch (error: any) {
    console.error('Error fetching compliance stats:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

