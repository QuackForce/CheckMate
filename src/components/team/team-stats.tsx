'use client'

import { Users, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'

interface TeamMember {
  id: string
  stats: {
    completedThisMonth: number
    overdueChecks: number
    avgDuration: number
  }
}

interface TeamStatsProps {
  team: TeamMember[]
}

export function TeamStats({ team }: TeamStatsProps) {
  const totalCompleted = team.reduce((sum, m) => sum + m.stats.completedThisMonth, 0)
  const totalOverdue = team.reduce((sum, m) => sum + m.stats.overdueChecks, 0)
  const totalDuration = team.reduce((sum, m) => sum + m.stats.avgDuration, 0)
  const avgDuration = team.length > 0 && totalDuration > 0 
    ? Math.round(totalDuration / team.length / 60) 
    : 0

  const stats = [
    {
      label: 'Team Members',
      value: team.length,
      subtext: 'Active',
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Completed',
      value: totalCompleted,
      subtext: 'This month',
      icon: CheckCircle2,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Overdue',
      value: totalOverdue,
      subtext: 'Need attention',
      icon: AlertTriangle,
      color: totalOverdue > 0 ? 'text-red-400' : 'text-surface-400',
      bg: totalOverdue > 0 ? 'bg-red-500/10' : 'bg-surface-700/50',
    },
    {
      label: 'Avg. Duration',
      value: `${avgDuration}m`,
      subtext: 'Per check',
      icon: Clock,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="card p-3 md:p-5 animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{stat.value}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-surface-400">{stat.label}</span>
            <span className="text-xs text-surface-500">{stat.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

