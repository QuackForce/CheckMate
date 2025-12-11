import { Header } from '@/components/layout/header'
import { TeamList } from '@/components/team/team-list'
import { TeamStats } from '@/components/team/team-stats'
import { TeamActions } from '@/components/team/team-actions'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
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
      ] = await Promise.all([
    // Get all users with manager relationship
    db.user.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        manager: {
          select: { id: true, name: true, email: true, jobTitle: true },
        },
      },
    }),
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

  // Build team data with stats from lookup maps
  const teamWithStats = users.map((user) => {
    const primaryCount = primaryClientsMap.get(user.id) || 0
    const secondaryCount = secondaryClientsMap.get(user.id) || 0
    const systemCount = systemClientsMap.get(user.id) || 0
    const grcCount = grcClientsMap.get(user.id) || 0
    
    return {
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role,
      image: user.image,
      jobTitle: user.jobTitle || null,
      team: user.team || null,
      managerId: user.managerId || null,
      manager: user.manager || null,
      notionTeamMemberId: user.notionTeamMemberId,
      notionTeamMemberName: user.notionTeamMemberName,
      slackUsername: user.slackUsername,
      hasHarvest: !!user.harvestAccessToken,
      createdAt: user.createdAt,
      stats: {
        assignedClients: primaryCount + secondaryCount + systemCount + grcCount,
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
  const [session, team] = await Promise.all([
    auth(),
    getTeamData(),
  ])

  const isAdmin = session?.user?.role === 'ADMIN'
  const currentUserId = session?.user?.id

  return (
    <>
      <Header 
        title="Team"
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Admin Actions */}
        {isAdmin && <TeamActions />}
        
        {/* Stats Overview */}
        <TeamStats team={team} />
        
        {/* Team List */}
        <TeamList team={team} isAdmin={isAdmin} currentUserId={currentUserId} />
      </div>
    </>
  )
}
