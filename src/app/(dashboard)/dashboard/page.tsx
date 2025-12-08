import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { UpcomingChecks } from '@/components/dashboard/upcoming-checks'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { MyTeamClients } from '@/components/dashboard/my-team-clients'
import { MyClients } from '@/components/dashboard/my-clients'
import { RecentCheckResults } from '@/components/dashboard/recent-check-results'
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

async function getDashboardData() {
  // Calculate date ranges
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // Get counts
  const [
    overdueCount,
    totalClients,
    activeClients,
    todayCount,
    thisWeekCount,
    completedThisMonth,
  ] = await Promise.all([
    // Overdue: either status is OVERDUE OR scheduled date is in the past (and not completed/cancelled)
    // Use lte (<=) for todayStart to handle timezone edge cases where midnight UTC 
    // represents "yesterday evening" in western timezones (e.g., Dec 7 00:00 UTC = Dec 6 4pm Pacific)
    db.infraCheck.count({ 
      where: { 
        OR: [
          { status: 'OVERDUE' },
          { 
            scheduledDate: { lte: todayStart },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          }
        ]
      } 
    }),
    db.client.count(),
    db.client.count({ where: { status: 'ACTIVE' } }),
    // Due today: strictly AFTER todayStart (to avoid overlap with overdue) up to todayEnd
    // Use lte for todayEnd to catch timezone edge cases
    db.infraCheck.count({ 
      where: { 
        scheduledDate: { gt: todayStart, lte: todayEnd },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      } 
    }),
    // All scheduled checks
    db.infraCheck.count({ 
      where: { 
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      } 
    }),
    // Completed this month
    db.infraCheck.count({ 
      where: { 
        status: 'COMPLETED',
        completedAt: { gte: monthStart, lt: monthEnd }
      } 
    }),
  ])

  // Get upcoming checks
  const upcomingChecks = await db.infraCheck.findMany({
    where: {
      status: { in: ['SCHEDULED', 'OVERDUE', 'IN_PROGRESS'] },
    },
    select: {
      id: true,
      scheduledDate: true,
      status: true,
      cadence: true,
      assignedEngineerName: true,
      client: { select: { id: true, name: true } },
      assignedEngineer: { select: { name: true, image: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 10,
  })

  // Get recent activity (completed, in progress, scheduled, slack posted)
  const [recentCompleted, recentInProgress, recentScheduled, recentSlackPosted] = await Promise.all([
    // Recently completed checks
    db.infraCheck.findMany({
      where: { status: 'COMPLETED' },
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
    // Recently started checks (IN_PROGRESS)
    db.infraCheck.findMany({
      where: { status: 'IN_PROGRESS' },
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
    // Recently scheduled checks
    db.infraCheck.findMany({
      where: { status: 'SCHEDULED' },
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
    // Checks with Slack messages posted
    db.infraCheck.findMany({
      where: { 
        slackMessageTs: { not: null },
      },
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

  // Format recent activity
  const recentActivity = [
    ...recentCompleted.map(check => ({
      id: `completed-${check.id}`,
      type: 'completed' as const,
      client: check.client.name,
      user: check.completedBy?.name || check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
      time: check.completedAt ? formatRelativeTime(check.completedAt) : 'Recently',
      timestamp: check.completedAt || new Date(),
    })),
    ...recentInProgress.map(check => ({
      id: `started-${check.id}`,
      type: 'started' as const,
      client: check.client.name,
      user: check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
      time: formatRelativeTime(check.updatedAt),
      timestamp: check.updatedAt,
    })),
    ...recentScheduled.map(check => ({
      id: `scheduled-${check.id}`,
      type: 'scheduled' as const,
      client: check.client.name,
      user: check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
      time: formatRelativeTime(check.createdAt),
      timestamp: check.createdAt,
    })),
    ...recentSlackPosted.map(check => ({
      id: `slack-${check.id}`,
      type: 'slack' as const,
      client: check.client.name,
      user: check.completedBy?.name || check.assignedEngineer?.name || check.assignedEngineerName || 'Unknown',
      time: formatRelativeTime(check.updatedAt),
      timestamp: check.updatedAt,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    // Remove duplicates (same check might appear in multiple lists)
    .filter((activity, index, self) => 
      index === self.findIndex(a => a.id === activity.id)
    )
    .slice(0, 8)

  return {
    stats: {
      overdueCount,
      todayCount,
      thisWeekCount,
      completedThisMonth,
      totalClients,
      activeClients,
    },
    checks: upcomingChecks.map(check => ({
      id: check.id,
      client: { id: check.client.id, name: check.client.name },
      scheduledDate: check.scheduledDate,
      status: check.status,
      cadence: check.cadence,
      assignedEngineer: { 
        name: check.assignedEngineer?.name || check.assignedEngineerName || 'Unassigned', 
        image: check.assignedEngineer?.image || null
      },
    })),
    recentActivity,
  }
}

export default async function DashboardPage() {
  const [session, dashboardData] = await Promise.all([
    auth(),
    getDashboardData(),
  ])
  
  const { stats, checks, recentActivity } = dashboardData
  const userName = session?.user?.name?.split(' ')[0] || 'there'
  const role = session?.user?.role || 'VIEWER'
  const canEdit = hasAnyPermission(role, ['checks:view_all', 'checks:view_own'])
  const canSeeOwnClients = hasAnyPermission(role, ['clients:view_all', 'clients:view_own'])
  const canSeeTeamClients = hasPermission(role, 'team:view')

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

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Checks - Takes 2 columns */}
          <div className="lg:col-span-2">
            <UpcomingChecks checks={checks} />
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-6">
            {canSeeOwnClients && <MyClients />}
            {/* My Team's Clients - shows for managers */}
            {canSeeTeamClients && <MyTeamClients />}

            <RecentCheckResults />
            
            <RecentActivity activities={recentActivity} />
          </div>
        </div>
      </div>
    </>
  )
}
