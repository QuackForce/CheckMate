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
  const canViewAll = hasPermission(userRole, 'clients:view_all')

  const searchParams = request.nextUrl.searchParams
  const assignee = searchParams.get('assignee') // 'me' or null

  try {
    // Build base where clause for "My Clients" filtering
    let whereClause: any = {}
    
    const shouldFilterToMyClients = !canViewAll || assignee === 'me'
    
    if (shouldFilterToMyClients && userId) {
      // Get client IDs where user has assignments
      const clientAssignments = await db.clientEngineerAssignment.findMany({
        where: { userId },
        select: { clientId: true },
        distinct: ['clientId'],
      })
      const assignedClientIds = clientAssignments.map(a => a.clientId)
      
      // Get client IDs where user is assigned as engineer for infra checks
      const checksAssignedToMe = await db.infraCheck.findMany({
        where: { assignedEngineerId: userId },
        select: { clientId: true },
        distinct: ['clientId'],
      })
      const engineerClientIds = checksAssignedToMe.map(c => c.clientId)
      
      const myClientIds = Array.from(new Set([...assignedClientIds, ...engineerClientIds]))
      
      if (myClientIds.length > 0) {
        whereClause = { id: { in: myClientIds } }
      } else {
        // User has no clients, return zeros
        return NextResponse.json({
          total: 0,
          active: 0,
          onboarding: 0,
          inactive: 0,
        })
      }
    }

    // Calculate stats with filters
    const [total, active, onboarding, inactive] = await Promise.all([
      db.client.count({ where: whereClause }),
      db.client.count({ where: { ...whereClause, status: 'ACTIVE' } }),
      db.client.count({ where: { ...whereClause, status: 'OFFBOARDING' } }),
      db.client.count({ where: { ...whereClause, status: 'INACTIVE' } }),
    ])

    return NextResponse.json({
      total,
      active,
      onboarding,
      inactive,
    })
  } catch (error: any) {
    console.error('Error fetching client stats:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

