import { Header } from '@/components/layout/header'
import { DashboardTabs } from '@/components/dashboard/dashboard-tabs'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission, hasAnyPermission } from '@/lib/permissions'

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(date).toLocaleDateString()
}

async function getDashboardData(userId?: string, isManager?: boolean) {
  // Calculate date ranges
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Base where clause for "My Work" (filtered by user)
  const myWorkFilter = userId ? {
    OR: [
      { assignedEngineerId: userId },
      { completedById: userId },
    ]
  } : undefined

  // Base where clause for "My Team" (all checks if manager, otherwise empty)
  const myTeamFilter = isManager ? undefined : { id: 'never-match' }

  // Helper to combine filters
  const combineWhere = (baseFilter: any, additionalConditions: any) => {
    if (!baseFilter) return additionalConditions
    return {
      AND: [
        baseFilter,
        additionalConditions
      ]
    }
  }

  // Get "My Work" stats
  const [
    myOverdueCount,
    myTodayCount,
    myThisWeekCount,
    myCompletedThisMonth,
  ] = await Promise.all([
    db.infraCheck.count({ 
      where: combineWhere(myWorkFilter, {
        OR: [
          { status: 'OVERDUE' },
          { 
            scheduledDate: { lte: todayStart },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          }
        ]
      })
    }),
    db.infraCheck.count({ 
      where: combineWhere(myWorkFilter, {
        scheduledDate: { gt: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      })
    }),
    db.infraCheck.count({ 
      where: combineWhere(myWorkFilter, {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      })
    }),
    db.infraCheck.count({ 
      where: combineWhere(myWorkFilter, {
        status: 'COMPLETED',
        completedAt: { gte: monthStart, lt: monthEnd }
      })
    }),
  ])

  // Get "My Team" stats (only if manager)
  const [
    teamOverdueCount,
    teamTodayCount,
    teamThisWeekCount,
    teamCompletedThisMonth,
  ] = await Promise.all([
    db.infraCheck.count({ 
      where: combineWhere(myTeamFilter, {
        OR: [
          { status: 'OVERDUE' },
          { 
            scheduledDate: { lte: todayStart },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          }
        ]
      })
    }),
    db.infraCheck.count({ 
      where: combineWhere(myTeamFilter, {
        scheduledDate: { gt: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      })
    }),
    db.infraCheck.count({ 
      where: combineWhere(myTeamFilter, {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      })
    }),
    db.infraCheck.count({ 
      where: combineWhere(myTeamFilter, {
        status: 'COMPLETED',
        completedAt: { gte: monthStart, lt: monthEnd }
      })
    }),
  ])

  // Get "My Work" upcoming checks
  const myUpcomingChecks = await db.infraCheck.findMany({
    where: combineWhere(myWorkFilter, {
      status: { in: ['SCHEDULED', 'OVERDUE', 'IN_PROGRESS'] },
    }),
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      cadence: true,
      assignedEngineerName: true,
      assignedEngineerId: true,
      client: { select: { id: true, name: true } },
      assignedEngineer: { select: { name: true, image: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 10,
  })

  // Get "My Team" upcoming checks
  const teamUpcomingChecks = await db.infraCheck.findMany({
    where: combineWhere(myTeamFilter, {
      status: { in: ['SCHEDULED', 'OVERDUE', 'IN_PROGRESS'] },
    }),
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      cadence: true,
      assignedEngineerName: true,
      assignedEngineerId: true,
      client: { select: { id: true, name: true } },
      assignedEngineer: { select: { name: true, image: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 10,
  })

  // Get "My Work" recent activity
  const [myRecentCompleted, myRecentInProgress, myRecentScheduled, myRecentSlackPosted] = await Promise.all([
    db.infraCheck.findMany({
      where: combineWhere(myWorkFilter, { status: 'COMPLETED' }),
      select: {
        id: true,
        completedAt: true,
        client: { select: { name: true } },
        completedBy: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    }),
    db.infraCheck.findMany({
      where: combineWhere(myWorkFilter, { status: 'IN_PROGRESS' }),
      select: {
        id: true,
        updatedAt: true,
        client: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    db.infraCheck.findMany({
      where: combineWhere(myWorkFilter, { status: 'SCHEDULED' }),
      select: {
        id: true,
        createdAt: true,
        client: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.infraCheck.findMany({
      where: combineWhere(myWorkFilter, {
        slackMessageTs: { not: null },
      }),
      select: {
        id: true,
        updatedAt: true,
        client: { select: { name: true } },
        completedBy: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  // Get "My Team" recent activity
  const [teamRecentCompleted, teamRecentInProgress, teamRecentScheduled, teamRecentSlackPosted] = await Promise.all([
    db.infraCheck.findMany({
      where: combineWhere(myTeamFilter, { status: 'COMPLETED' }),
      select: {
        id: true,
        completedAt: true,
        client: { select: { name: true } },
        completedBy: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    }),
    db.infraCheck.findMany({
      where: combineWhere(myTeamFilter, { status: 'IN_PROGRESS' }),
      select: {
        id: true,
        updatedAt: true,
        client: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    db.infraCheck.findMany({
      where: combineWhere(myTeamFilter, { status: 'SCHEDULED' }),
      select: {
        id: true,
        createdAt: true,
        client: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    db.infraCheck.findMany({
      where: combineWhere(myTeamFilter, {
        slackMessageTs: { not: null },
      }),
      select: {
        id: true,
        updatedAt: true,
        client: { select: { name: true } },
        completedBy: { select: { name: true } },
        assignedEngineer: { select: { name: true } },
        assignedEngineerName: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  // Format "My Work" recent activity
  const formatActivity = (
    completed: any[],
    inProgress: any[],
    scheduled: any[],
    slackPosted: any[]
  ) => {
    return [
      ...completed.map(check => ({
        id: `completed-${check.id}`,
        type: 'completed' as const,
        client: check.Client.name,
        user: check.completedBy?.name || check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
        time: check.completedAt ? formatRelativeTime(check.completedAt) : 'Recently',
        timestamp: check.completedAt || new Date(),
      })),
      ...inProgress.map(check => ({
        id: `started-${check.id}`,
        type: 'started' as const,
        client: check.Client.name,
        user: check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
        time: formatRelativeTime(check.updatedAt),
        timestamp: check.updatedAt,
      })),
      ...scheduled.map(check => ({
        id: `scheduled-${check.id}`,
        type: 'scheduled' as const,
        client: check.Client.name,
        user: check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
        time: formatRelativeTime(check.createdAt),
        timestamp: check.createdAt,
      })),
      ...slackPosted.map(check => ({
        id: `slack-${check.id}`,
        type: 'slack' as const,
        client: check.Client.name,
        user: check.completedBy?.name || check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
        time: formatRelativeTime(check.updatedAt),
        timestamp: check.updatedAt,
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      )
      .slice(0, 8)
  }

  const myRecentActivity = formatActivity(
    myRecentCompleted,
    myRecentInProgress,
    myRecentScheduled,
    myRecentSlackPosted
  )

  const teamRecentActivity = formatActivity(
    teamRecentCompleted,
    teamRecentInProgress,
    teamRecentScheduled,
    teamRecentSlackPosted
  )

  return {
    myWork: {
      stats: {
        overdueCount: myOverdueCount,
        todayCount: myTodayCount,
        thisWeekCount: myThisWeekCount,
        completedThisMonth: myCompletedThisMonth,
        totalClients: 0, // Will be calculated client-side from MyClients
        activeClients: 0, // Will be calculated client-side from MyClients
      },
      checks: myUpcomingChecks.map(check => ({
        id: check.id,
        client: { id: check.Client.id, name: check.Client.name },
        scheduledDate: check.scheduledDate,
        status: check.status,
        cadence: check.cadence,
        assignedEngineer: { 
          name: check.assignedEngineer?.name || check.assignedEngineerName || 'Unassigned', 
          image: check.assignedEngineer?.image || null
        },
      })),
      recentActivity: myRecentActivity,
    },
    myTeam: {
      stats: {
        overdueCount: teamOverdueCount,
        todayCount: teamTodayCount,
        thisWeekCount: teamThisWeekCount,
        completedThisMonth: teamCompletedThisMonth,
        totalClients: 0, // Will be calculated client-side from MyTeamClients
        activeClients: 0, // Will be calculated client-side from MyTeamClients
      },
      checks: teamUpcomingChecks.map(check => ({
        id: check.id,
        client: { id: check.Client.id, name: check.Client.name },
        scheduledDate: check.scheduledDate,
        status: check.status,
        cadence: check.cadence,
        assignedEngineer: { 
          name: check.assignedEngineer?.name || check.assignedEngineerName || 'Unassigned', 
          image: check.assignedEngineer?.image || null
        },
      })),
      recentActivity: teamRecentActivity,
    },
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  const userName = session?.user?.name?.split(' ')[0] || 'there'
  const role = session?.user?.role || 'VIEWER'
  const canEdit = hasAnyPermission(role, ['checks:view_all', 'checks:view_own'])
  const canSeeOwnClients = hasAnyPermission(role, ['clients:view_all', 'clients:view_own'])
  const canSeeTeamClients = hasPermission(role, 'team:view')
  
  // Only ADMIN and IT_MANAGER can see "My Team" view (managers only)
  const canViewTeam = role === 'ADMIN' || role === 'IT_MANAGER'

  // Determine if user is a manager (for team view filtering)
  const isManager = canViewTeam

  const dashboardData = await getDashboardData(userId, isManager)
  
  const { myWork, myTeam } = dashboardData

  return (
    <>
      <Header 
        title={`Welcome back, ${userName}`}
        subtitle={new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })}
        action={canEdit ? { label: 'New Check', href: '/checks/new' } : undefined}
      />

      <div className="flex-1 px-4 md:px-6 pt-2 md:pt-4 pb-6 space-y-4 md:space-y-6 overflow-y-auto">
        <DashboardTabs 
          canViewTeam={canViewTeam}
          canSeeOwnClients={canSeeOwnClients}
          myWorkData={myWork}
          myTeamData={myTeam}
        />
      </div>
    </>
  )
}
