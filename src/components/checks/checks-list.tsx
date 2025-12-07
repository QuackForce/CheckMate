'use client'

import Link from 'next/link'
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Calendar,
  User,
  MoreHorizontal,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { cn, formatDate, getRelativeTime, getCadenceLabel, getStatusColor } from '@/lib/utils'

interface Check {
  id: string
  client: { id: string; name: string }
  assignedEngineer: { id: string; name: string; image: string | null }
  scheduledDate: Date
  dueDate: Date
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE'
  cadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY'
  progress: { completed: number; total: number }
  completedAt?: Date
}

interface ChecksListProps {
  checks: Check[]
}

const statusIcons = {
  SCHEDULED: Calendar,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle2,
  CANCELLED: RefreshCw,
  OVERDUE: AlertTriangle,
}

export function ChecksList({ checks }: ChecksListProps) {
  return (
    <div className="space-y-3">
      {checks.map((check, index) => {
        const StatusIcon = statusIcons[check.status]
        const progressPercent = (check.progress.completed / check.progress.total) * 100

        return (
          <div
            key={check.id}
            className={cn(
              'card p-4 hover:bg-surface-800/50 transition-all duration-200 animate-slide-up',
              check.status === 'OVERDUE' && 'border-red-500/30 bg-red-500/5'
            )}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Status icon */}
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  check.status === 'OVERDUE' && 'bg-red-500/20',
                  check.status === 'IN_PROGRESS' && 'bg-yellow-500/20',
                  check.status === 'COMPLETED' && 'bg-brand-500/20',
                  check.status === 'SCHEDULED' && 'bg-blue-500/20',
                  check.status === 'CANCELLED' && 'bg-surface-700/50'
                )}
              >
                <StatusIcon
                  className={cn(
                    'w-6 h-6',
                    check.status === 'OVERDUE' && 'text-red-400',
                    check.status === 'IN_PROGRESS' && 'text-yellow-400',
                    check.status === 'COMPLETED' && 'text-brand-400',
                    check.status === 'SCHEDULED' && 'text-blue-400',
                    check.status === 'CANCELLED' && 'text-surface-400'
                  )}
                />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Link
                    href={`/clients/${check.client.id}`}
                    className="font-semibold text-white hover:text-brand-400 transition-colors"
                  >
                    {check.client.name}
                  </Link>
                  <span className={cn('badge', getStatusColor(check.status))}>
                    {check.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-surface-500 bg-surface-700/50 px-2 py-0.5 rounded">
                    {getCadenceLabel(check.cadence)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-surface-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {check.status === 'COMPLETED' && check.completedAt
                        ? `Completed ${formatDate(check.completedAt)}`
                        : getRelativeTime(check.scheduledDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{check.assignedEngineer.name}</span>
                  </div>
                </div>

                {/* Progress bar for in-progress checks */}
                {check.status === 'IN_PROGRESS' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-surface-400">Progress</span>
                      <span className="text-surface-300">
                        {check.progress.completed}/{check.progress.total} items
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {check.status === 'COMPLETED' ? (
                  <>
                    <button className="btn-ghost text-sm">
                      <MessageSquare className="w-4 h-4" />
                      View Report
                    </button>
                    <button className="btn-secondary text-sm">
                      <RefreshCw className="w-4 h-4" />
                      Schedule Next
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/checks/${check.id}`}
                    className={cn(
                      'btn text-sm',
                      check.status === 'OVERDUE' || check.status === 'IN_PROGRESS'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    )}
                  >
                    <Play className="w-4 h-4" />
                    {check.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
                  </Link>
                )}

                <button className="p-2 hover:bg-surface-700 rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-surface-400" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}



