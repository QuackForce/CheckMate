import { Header } from '@/components/layout/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { UpcomingChecks } from '@/components/dashboard/upcoming-checks'
import { TeamOverview } from '@/components/dashboard/team-overview'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

async function getDashboardData() {
  // Get counts
  const [
    overdueCount,
    totalClients,
    activeClients,
    scheduledChecksCount,
  ] = await Promise.all([
    db.infraCheck.count({ where: { status: 'OVERDUE' } }),
    db.client.count(),
    db.client.count({ where: { status: 'ACTIVE' } }),
    db.infraCheck.count({ where: { status: 'SCHEDULED' } }),
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
      assignedEngineerName: true, // Include this field explicitly
      client: { select: { id: true, name: true } },
      assignedEngineer: { select: { name: true, image: true } },
    },
    orderBy: { scheduledDate: 'asc' },
    take: 10,
  })

  return {
    stats: {
      overdueCount,
      todayCount: 0, // TODO: Calculate based on today's date
      thisWeekCount: scheduledChecksCount,
      completedThisMonth: 0, // TODO: Calculate based on current month
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
  }
}

export default async function DashboardPage() {
  const [session, dashboardData] = await Promise.all([
    auth(),
    getDashboardData(),
  ])
  
  const { stats, checks } = dashboardData
  const userName = session?.user?.name?.split(' ')[0] || 'there'
  const canEdit = session?.user?.role === 'ADMIN' || session?.user?.role === 'IT_ENGINEER'

  // Empty team and activity for now until we have real data
  const emptyTeam: any[] = []
  const emptyActivity: any[] = []

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
            <TeamOverview team={emptyTeam} />
            <RecentActivity activities={emptyActivity} />
          </div>
        </div>
      </div>
    </>
  )
}
