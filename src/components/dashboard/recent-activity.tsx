'use client'

import { CheckCircle2, Play, Calendar, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Activity {
  id: string
  type: 'completed' | 'started' | 'scheduled' | 'slack'
  client: string
  user: string
  time: string
}

interface RecentActivityProps {
  activities: Activity[]
}

const activityConfig = {
  completed: {
    icon: CheckCircle2,
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    label: 'completed check for',
  },
  started: {
    icon: Play,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    label: 'started check for',
  },
  scheduled: {
    icon: Calendar,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'scheduled check for',
  },
  slack: {
    icon: MessageSquare,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    label: 'posted report for',
  },
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-surface-700/50">
        <h2 className="font-semibold text-white">Recent Activity</h2>
      </div>

      {activities.length > 0 ? (
        <div className="p-3 space-y-1">
          {activities.map((activity) => {
            const config = activityConfig[activity.type]
            const Icon = config.icon

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-800/50 transition-colors"
              >
                <div className={cn('p-1.5 rounded-lg', config.bg)}>
                  <Icon className={cn('w-4 h-4', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-300">
                    <span className="font-medium text-white">{activity.user}</span>
                    {' '}{config.label}{' '}
                    <span className="font-medium text-white">{activity.client}</span>
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-surface-500">No recent activity</p>
        </div>
      )}
    </div>
  )
}



