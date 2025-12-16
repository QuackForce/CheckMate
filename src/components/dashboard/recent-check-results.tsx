'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type CheckStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'

interface CheckItem {
  id: string
  status: CheckStatus
  scheduledDate: string | null
  client: { id: string; name: string }
  assignedEngineerName?: string | null
}

const statusStyles: Record<CheckStatus, { label: string; className: string }> = {
  SCHEDULED: { label: 'Scheduled', className: 'text-surface-400' },
  IN_PROGRESS: { label: 'In Progress', className: 'text-amber-400' },
  COMPLETED: { label: 'Completed', className: 'text-emerald-400' },
  OVERDUE: { label: 'Overdue', className: 'text-red-400' },
  CANCELLED: { label: 'Cancelled', className: 'text-surface-500' },
}

export function RecentCheckResults() {
  const [checks, setChecks] = useState<CheckItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchChecks = async () => {
      try {
        const res = await fetch('/api/checks?limit=8')
        if (cancelled) return
        if (res.ok) {
          const json = await res.json()
          setChecks(json.checks || [])
        }
      } catch (err) {
        console.error('Failed to load recent checks', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchChecks()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Recent Checks</h3>
          <p className="text-xs text-surface-500">Latest scheduled and completed checks</p>
        </div>
        <Link href="/checks" className="text-sm text-brand-400 hover:text-brand-300">
          View all
        </Link>
      </div>

      <div className="divide-y divide-surface-700/50 max-h-72 overflow-y-auto">
        {checks.slice(0, 8).map((check) => {
          const style = statusStyles[check.status] || statusStyles.SCHEDULED
          const date = check.scheduledDate ? new Date(check.scheduledDate).toLocaleDateString() : '—'
          const Icon =
            check.status === 'COMPLETED'
              ? CheckCircle2
              : check.status === 'OVERDUE'
              ? XCircle
              : Clock

          return (
            <Link
              key={check.id}
              href={`/checks/${check.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-800/40 transition-colors"
            >
              <Icon className={cn('w-4 h-4', style.className)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{check.client?.name || 'Unknown client'}</p>
                <p className="text-xs text-surface-500 truncate">
                  {style.label} • {date}
                  {check.assignedEngineerName ? ` • ${check.assignedEngineerName}` : ''}
                </p>
              </div>
            </Link>
          )
        })}

        {checks.length === 0 && (
          <div className="p-4 text-center text-surface-500 text-sm">No recent checks</div>
        )}
      </div>
    </div>
  )
}






