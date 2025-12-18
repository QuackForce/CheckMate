import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Rate limiting
  const session = await auth()
  const identifier = getIdentifier(session?.user?.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.RELAXED)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = session.user.role
  const userId = session.user.id
  const canViewAll = hasPermission(userRole, 'checks:view_all')

  const searchParams = request.nextUrl.searchParams
  const assignee = searchParams.get('assignee') // 'me' or null

  try {
    // Build base where clause for "My Clients" filtering
    let clientIdFilter: { clientId?: { in: string[] } } = {}
    
    const shouldFilterToMyClients = !canViewAll || assignee === 'me'
    
    if (shouldFilterToMyClients && userId) {
      // Get client IDs where user has assignments
      const clientAssignments = await db.clientEngineerAssignment.findMany({
        where: { userId },
        select: { clientId: true },
        distinct: ['clientId'],
      })
      const assignedClientIds = clientAssignments.map(a => a.clientId)
      
      // Get client IDs where user is assigned as engineer
      const checksAssignedToMe = await db.infraCheck.findMany({
        where: { assignedEngineerId: userId },
        select: { clientId: true },
        distinct: ['clientId'],
      })
      const engineerClientIds = checksAssignedToMe.map(c => c.clientId)
      
      const myClientIds = Array.from(new Set([...assignedClientIds, ...engineerClientIds]))
      
      if (myClientIds.length > 0) {
        clientIdFilter = { clientId: { in: myClientIds } }
      } else {
        // User has no clients, return zeros
        return NextResponse.json({
          total: 0,
          overdue: 0,
          inProgress: 0,
          completed: 0,
        })
      }
    }

    // Calculate stats with filters
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [total, overdue, inProgress, completed] = await Promise.all([
      // Total (excluding cancelled)
      db.infraCheck.count({
        where: {
          ...clientIdFilter,
          status: { notIn: ['CANCELLED'] },
        },
      }),
      // Overdue: scheduled date is in the past and not completed/cancelled
      db.infraCheck.count({
        where: {
          ...clientIdFilter,
          scheduledDate: { lt: today },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      // In Progress
      db.infraCheck.count({
        where: {
          ...clientIdFilter,
          status: 'IN_PROGRESS',
        },
      }),
      // Completed
      db.infraCheck.count({
        where: {
          ...clientIdFilter,
          status: 'COMPLETED',
        },
      }),
    ])

    return NextResponse.json({
      total,
      overdue,
      inProgress,
      completed,
    })
  } catch (error: any) {
    console.error('Error fetching check stats:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

