'use client'

import { FileText, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ReportsStatsProps {
  stats: {
    totalReports: number
    avgDuration: number // in seconds
    cleanPercentage: number
    totalIssues: number
  }
}

export function ReportsStats({ stats }: ReportsStatsProps) {
  // Format duration from seconds to "Xm" format
  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0m'
    const minutes = Math.round(seconds / 60)
    return `${minutes}m`
  }

  const statsData = [
    {
      label: 'Total Reports',
      value: stats.totalReports.toString(),
      subtext: 'This month',
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Avg. Duration',
      value: formatDuration(stats.avgDuration),
      subtext: 'Per check',
      icon: Clock,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Clean Reports',
      value: `${stats.cleanPercentage}%`,
      subtext: 'No issues found',
      icon: CheckCircle2,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Issues Found',
      value: stats.totalIssues.toString(),
      subtext: 'Across all checks',
      icon: AlertTriangle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <div
          key={stat.label}
          className="card p-5 animate-slide-up"
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

