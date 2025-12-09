'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatsCards } from './stats-cards'
import { UpcomingChecks } from './upcoming-checks'
import { RecentActivity } from './recent-activity'
import { MyClients } from './my-clients'
import { MyTeamClients } from './my-team-clients'
import { RecentCheckResults } from './recent-check-results'
import type { DashboardStats } from '@/types'

type DashboardView = 'my-work' | 'my-team'

interface DashboardData {
  stats: DashboardStats
  checks: Array<{
    id: string
    client: { id: string; name: string }
    scheduledDate: Date
    status: string
    cadence: string
    assignedEngineer: { name: string; image: string | null }
  }>
  recentActivity: Array<{
    id: string
    type: string
    client: string
    user: string
    time: string
    timestamp: Date
  }>
}

interface DashboardTabsProps {
  canViewTeam: boolean
  canSeeOwnClients: boolean
  myWorkData: DashboardData
  myTeamData: DashboardData
}

export function DashboardTabs({ 
  canViewTeam, 
  canSeeOwnClients,
  myWorkData,
  myTeamData 
}: DashboardTabsProps) {
  const [view, setView] = useState<DashboardView>('my-work')

  // Load saved preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-view') as DashboardView | null
      if (saved && (saved === 'my-work' || (saved === 'my-team' && canViewTeam))) {
        setView(saved)
      }
    }
  }, [canViewTeam])

  // Save preference to localStorage
  const handleViewChange = (newView: DashboardView) => {
    setView(newView)
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-view', newView)
    }
  }

  // If user can't view team, always show "My Work"
  const effectiveView = canViewTeam ? view : 'my-work'
  const data = effectiveView === 'my-work' ? myWorkData : myTeamData

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {canViewTeam && (
        <div className="flex gap-2 border-b border-surface-700/50 pb-4">
          <button
            onClick={() => handleViewChange('my-work')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all border',
              effectiveView === 'my-work'
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                : 'text-surface-400 hover:text-white hover:bg-surface-800 border-transparent'
            )}
          >
            <Briefcase className="w-4 h-4" />
            <span className="font-medium">My Work</span>
          </button>
          <button
            onClick={() => handleViewChange('my-team')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all border',
              effectiveView === 'my-team'
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                : 'text-surface-400 hover:text-white hover:bg-surface-800 border-transparent'
            )}
          >
            <Users className="w-4 h-4" />
            <span className="font-medium">My Team</span>
          </button>
        </div>
      )}

      {/* Content */}
      <>
        {/* Stats Cards */}
        <StatsCards stats={data.stats} />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Checks - Takes 2 columns */}
          <div className="lg:col-span-2">
            <UpcomingChecks checks={data.checks.map(check => ({
              ...check,
              status: check.status as 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE',
              cadence: check.cadence as 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'ADHOC' | 'CUSTOM',
            }))} />
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-6">
            {effectiveView === 'my-work' && canSeeOwnClients && <MyClients />}
            {effectiveView === 'my-team' && canViewTeam && <MyTeamClients />}

            <RecentCheckResults />
            
            <RecentActivity activities={data.recentActivity.map(activity => ({
              ...activity,
              type: activity.type as 'slack' | 'completed' | 'started' | 'scheduled',
            }))} />
          </div>
        </div>
      </>
    </div>
  )
}

