'use client'

import { AlertTriangle, Calendar, CheckCircle2, Building2 } from 'lucide-react'
import type { DashboardStats } from '@/types'

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Overdue',
      value: stats.overdueCount,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      subtext: stats.overdueCount > 0 ? 'Need attention' : 'All caught up!',
    },
    {
      label: 'Due Today',
      value: stats.todayCount,
      icon: Calendar,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      subtext: 'Scheduled for today',
    },
    {
      label: 'Scheduled',
      value: stats.thisWeekCount,
      icon: CheckCircle2,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      subtext: 'Upcoming checks',
    },
    {
      label: 'Completed',
      value: stats.completedThisMonth,
      icon: Building2,
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/10',
      borderColor: 'border-brand-500/20',
      subtext: 'This month',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={card.label}
          className={`card p-5 border ${card.borderColor} animate-slide-up`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            {card.label === 'Overdue' && stats.overdueCount > 0 && (
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
          </div>
          <div className="stat-value">{card.value}</div>
          <div className="flex items-center justify-between mt-1">
            <span className="stat-label">{card.label}</span>
            <span className="text-xs text-surface-500">{card.subtext}</span>
          </div>
        </div>
      ))}
    </div>
  )
}



