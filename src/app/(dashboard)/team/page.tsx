import { Header } from '@/components/layout/header'
import { TeamList } from '@/components/team/team-list'
import { TeamStats } from '@/components/team/team-stats'
import { TeamActions } from '@/components/team/team-actions'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

async function getTeamData() {
  // Get all users with their basic info
  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
  })

  // Get additional stats for each user
  const teamWithStats = await Promise.all(
    users.map(async (user) => {
      // Count overdue checks assigned to this user
      const overdueChecks = await db.infraCheck.count({
        where: {
          assignedEngineerId: user.id,
          status: 'OVERDUE',
        }
      })

      // Count completed this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const completedThisMonth = await db.infraCheck.count({
        where: {
          completedById: user.id,
          status: 'COMPLETED',
          completedAt: { gte: startOfMonth }
        }
      })

      // Count assigned clients:
      // - linked via primaryEngineerId / secondaryEngineerId
      // - OR Notion SE / infra assignee name contains their name (handles \"(TL - SE)\" suffix etc.)
      const matchName = (user.notionTeamMemberName || user.name || '').trim()
      const assignedClients = await db.client.count({
        where: {
          OR: [
            { primaryEngineerId: user.id },
            { secondaryEngineerId: user.id },
            matchName
              ? {
                  systemEngineerName: {
                    contains: matchName,
                    mode: 'insensitive',
                  },
                }
              : undefined,
            matchName
              ? {
                  infraCheckAssigneeName: {
                    contains: matchName,
                    mode: 'insensitive',
                  },
                }
              : undefined,
          ].filter(Boolean) as any,
        },
      })

      return {
        id: user.id,
        name: user.name || 'Unknown',
        email: user.email || '',
        role: user.role,
        image: user.image,
        notionTeamMemberId: user.notionTeamMemberId,
        notionTeamMemberName: user.notionTeamMemberName,
        slackUsername: user.slackUsername,
        hasHarvest: !!user.harvestAccessToken,
        createdAt: user.createdAt,
        stats: {
          assignedClients,
          completedThisMonth,
          overdueChecks,
          avgDuration: 0, // TODO: Calculate from timer sessions
        }
      }
    })
  )

  return teamWithStats
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
        subtitle={`${team.length} team member${team.length !== 1 ? 's' : ''} • Manage your IT Engineers and view performance`}
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
