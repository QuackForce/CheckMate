'use client'

import Link from 'next/link'
import { 
  ArrowRight, 
  Clock, 
  AlertTriangle,
  Play,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { cn, getRelativeTime, getCadenceLabel, getStatusColor } from '@/lib/utils'

interface Check {
  id: string
  client: { name: string; id: string }
  scheduledDate: Date
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE'
  cadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'ADHOC' | 'CUSTOM'
  assignedEngineer: { name: string; image: string | null }
}

interface UpcomingChecksProps {
  checks: Check[]
}

export function UpcomingChecks({ checks }: UpcomingChecksProps) {
  const isOverdue = (check: Check) => {
    return check.status === 'OVERDUE' || new Date(check.scheduledDate) < new Date()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="card">
      <div className="p-5 border-b border-surface-700/50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Upcoming Checks</h2>
          <p className="text-sm text-surface-400 mt-0.5">Your scheduled infrastructure reviews</p>
        </div>
        <Link 
          href="/checks" 
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-surface-700/50">
        {checks.map((check, index) => {
          const overdue = isOverdue(check)
          const today = isToday(new Date(check.scheduledDate))

          return (
            <div
              key={check.id}
              className={cn(
                'p-4 flex items-center gap-4 hover:bg-surface-800/50 transition-colors animate-slide-up',
                overdue && 'bg-red-500/5'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Status indicator */}
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                overdue ? 'bg-red-500/20' : today ? 'bg-yellow-500/20' : 'bg-surface-700/50'
              )}>
                {overdue ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : today ? (
                  <Clock className="w-5 h-5 text-yellow-400" />
                ) : (
                  <Calendar className="w-5 h-5 text-surface-400" />
                )}
              </div>

              {/* Client info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/clients/${check.client.id}`}
                    className="font-medium text-white hover:text-brand-400 transition-colors truncate"
                  >
                    {check.client.name}
                  </Link>
                  <span className={cn('badge', getStatusColor(overdue ? 'OVERDUE' : check.status))}>
                    {overdue ? 'Overdue' : today ? 'Today' : check.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                  <span>{getCadenceLabel(check.cadence)}</span>
                  <span>•</span>
                  <span>{getRelativeTime(check.scheduledDate)}</span>
                  <span>•</span>
                  <span>{check.assignedEngineer.name}</span>
                </div>
              </div>

              {/* Action */}
              <Link
                href={`/checks/${check.id}`}
                className={cn(
                  'btn text-sm',
                  overdue || today
                    ? 'btn-primary'
                    : 'btn-secondary'
                )}
              >
                <Play className="w-4 h-4" />
                {check.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
              </Link>
            </div>
          )
        })}
      </div>

      {checks.length === 0 && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-brand-400" />
          </div>
          <p className="text-surface-300 font-medium">All caught up!</p>
          <p className="text-sm text-surface-500 mt-1">No upcoming checks scheduled</p>
        </div>
      )}
    </div>
  )
}

