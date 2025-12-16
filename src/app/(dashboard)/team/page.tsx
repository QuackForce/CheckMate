import { Header } from '@/components/layout/header'
import { TeamList } from '@/components/team/team-list'
import { TeamStats } from '@/components/team/team-stats'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getEmergencySession } from '@/lib/auth-utils'
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

async function getTeamData() {
  // Use cache wrapper - fetches from cache or database
  return await withCache(
    CACHE_KEYS.team(),
    async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      // Fetch all data in parallel (5 queries instead of 192!)
      const [
        users,
        overdueByUser,
        completedByUser,
        clientsByPrimary,
        clientsBySecondary,
        clientsBySystemEngineer,
        clientsByGrcEngineer,
        _legacyClients, // No longer used, but kept for Promise.all structure
        infraChecksByAssignee,
        engineerAssignments,
      ] = await Promise.all([
    // Get all users with manager relationship and login activity
    // Try to select login fields, but handle gracefully if they don't exist in DB
    (async () => {
      try {
        const users = await db.user.findMany({
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            jobTitle: true,
            team: true,
            managerId: true,
            User: {
              select: { id: true, name: true, email: true, jobTitle: true },
            },
            notionTeamMemberId: true,
            notionTeamMemberName: true,
            slackUsername: true,
            harvestAccessToken: true,
            createdAt: true,
            emailVerified: true, // Use this as fallback indicator of login
            Account: {
              where: { provider: 'google' },
              select: { id: true },
            },
            // Try to select login fields - they exist in schema and should be in DB
            // @ts-ignore - Prisma types may be out of sync, but these fields exist in schema
            lastLoginAt: true,
            // @ts-ignore - Prisma types may be out of sync, but these fields exist in schema
            loginCount: true,
          },
        })
        // If lastLoginAt is null but user has emailVerified or Google account, they've logged in
        return users.map(user => {
          const userAny = user as any
          const hasGoogleAccount = userAny.Account && userAny.Account.length > 0
          return {
            ...user,
            // If lastLoginAt is null but they have emailVerified or Google account, they've logged in before
            // Use emailVerified date as fallback, or indicate they've logged in but date is missing
            lastLoginAt: userAny.lastLoginAt || 
              (user.emailVerified && hasGoogleAccount ? user.emailVerified : null),
          }
        })
      } catch (error: any) {
        // If login fields don't exist in DB, fall back to query without them
        console.warn('[Team Page] Login fields not available, using fallback:', error.message)
        const users = await db.user.findMany({
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            jobTitle: true,
            team: true,
            managerId: true,
            User: {
              select: { id: true, name: true, email: true, jobTitle: true },
            },
            notionTeamMemberId: true,
            notionTeamMemberName: true,
            slackUsername: true,
            harvestAccessToken: true,
            createdAt: true,
            emailVerified: true,
            Account: {
              where: { provider: 'google' },
              select: { id: true },
            },
          },
        })
        // Use emailVerified as fallback indicator of login
        return users.map(user => {
          const userAny = user as any
          const hasGoogleAccount = userAny.Account && userAny.Account.length > 0
          return {
            ...user,
            lastLoginAt: user.emailVerified && hasGoogleAccount ? user.emailVerified : null,
            loginCount: 0,
          }
        })
      }
    })(),
    // Get overdue checks grouped by assignee
    db.infraCheck.groupBy({
      by: ['assignedEngineerId'],
      where: { status: 'OVERDUE', assignedEngineerId: { not: null } },
      _count: { id: true },
    }),
    // Get completed this month grouped by completedBy
    db.infraCheck.groupBy({
      by: ['completedById'],
      where: { 
        status: 'COMPLETED', 
        completedAt: { gte: startOfMonth },
        completedById: { not: null }
      },
      _count: { id: true },
    }),
    // Get clients by primary engineer
    db.client.groupBy({
      by: ['primaryEngineerId'],
      where: { primaryEngineerId: { not: null } },
      _count: { id: true },
    }),
    // Get clients by secondary engineer
    db.client.groupBy({
      by: ['secondaryEngineerId'],
      where: { secondaryEngineerId: { not: null } },
      _count: { id: true },
    }),
    // Get clients by system engineer
    db.client.groupBy({
      by: ['systemEngineerId'],
      where: { systemEngineerId: { not: null } },
      _count: { id: true },
    }),
    // Get clients by GRC engineer
    db.client.groupBy({
      by: ['grceEngineerId'],
      where: { grceEngineerId: { not: null } },
      _count: { id: true },
    }),
    // Legacy fields no longer needed - all data is in ClientEngineerAssignment
    // Keeping empty array for Promise.all structure
    Promise.resolve([]),
    // Get infra checks to include assignments in "My Clients" parity
    db.infraCheck.findMany({
      where: { assignedEngineerId: { not: null } },
      select: {
        assignedEngineerId: true,
        clientId: true,
      },
    }),
    db.clientEngineerAssignment.findMany({
      select: {
        clientId: true,
        userId: true,
      },
    }),
  ])

  // Create lookup maps for O(1) access
  const overdueMap = new Map(
    overdueByUser.map(r => [r.assignedEngineerId, r._count.id])
  )
  const completedMap = new Map(
    completedByUser.map(r => [r.completedById, r._count.id])
  )
  const primaryClientsMap = new Map(
    clientsByPrimary.map(r => [r.primaryEngineerId, r._count.id])
  )
  const secondaryClientsMap = new Map(
    clientsBySecondary.map(r => [r.secondaryEngineerId, r._count.id])
  )
  const systemClientsMap = new Map(
    clientsBySystemEngineer.map(r => [r.systemEngineerId, r._count.id])
  )
  const grcClientsMap = new Map(
    clientsByGrcEngineer.map(r => [r.grceEngineerId, r._count.id])
  )

  // Build distinct client assignments per user
  // Now using only ClientEngineerAssignment table (legacy fields migrated)
  const assignedMap = new Map<string, Set<string>>()
  
  // Add assignments from ClientEngineerAssignment table
  for (const ea of engineerAssignments) {
    if (!ea.userId) continue
    if (!assignedMap.has(ea.userId)) assignedMap.set(ea.userId, new Set<string>())
    assignedMap.get(ea.userId)!.add(ea.clientId)
  }
  
  // Add infra check assignments
  for (const ic of infraChecksByAssignee) {
    if (!ic.assignedEngineerId) continue
    if (!assignedMap.has(ic.assignedEngineerId)) assignedMap.set(ic.assignedEngineerId, new Set<string>())
    assignedMap.get(ic.assignedEngineerId)!.add(ic.clientId)
  }

  // Build team data with stats from lookup maps and distinct assignments
  const teamWithStats = users.map((user: any) => {
    const assignedSet = assignedMap.get(user.id)
    const assignedClients = assignedSet ? assignedSet.size : 0
    
    return {
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role,
      image: user.image,
      jobTitle: user.jobTitle || null,
      team: user.team || null,
      managerId: user.UserId || null,
      manager: user.User || null,
      notionTeamMemberId: user.notionTeamMemberId,
      notionTeamMemberName: user.notionTeamMemberName,
      slackUsername: user.slackUsername,
      hasHarvest: !!user.harvestAccessToken,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null,
      loginCount: user.loginCount || 0,
      stats: {
        assignedClients,
        completedThisMonth: completedMap.get(user.id) || 0,
        overdueChecks: overdueMap.get(user.id) || 0,
        avgDuration: 0,
      }
    }
  })

      return teamWithStats
    },
    CACHE_TTL.team
  )
}

export default async function TeamPage() {
  const [authSession, team] = await Promise.all([
    auth(),
    getTeamData(),
  ])

  // Check both NextAuth and emergency sessions
  let session = authSession
  if (!session?.user) {
    const emergencySession = await getEmergencySession()
    if (emergencySession) {
      session = emergencySession as any
    }
  }

  const isAdmin = session?.user?.role === 'ADMIN'
  const currentUserId = session?.user?.id

  return (
    <>
      <Header 
        title="Users"
      />

      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
        {/* Stats Overview */}
        <TeamStats team={team} />
        
        {/* Team List */}
        <TeamList team={team} isAdmin={isAdmin} currentUserId={currentUserId} />
      </div>
    </>
  )
}
