'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Loader2 } from 'lucide-react'

interface CheckStats {
  total: number
  overdue: number
  inProgress: number
  completed: number
}

interface ChecksStatsProps {
  myClientsOnly: boolean
  onStatsUpdate?: (total: number) => void
}

export function ChecksStats({ myClientsOnly, onStatsUpdate }: ChecksStatsProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canViewAll = hasPermission(userRole, 'checks:view_all')
  
  const [stats, setStats] = useState<CheckStats>({
    total: 0,
    overdue: 0,
    inProgress: 0,
    completed: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        // Only send assignee=me if user can view all and filter is enabled
        if (canViewAll && myClientsOnly) {
          params.append('assignee', 'me')
        } else if (!canViewAll) {
          // If user can only view own, always filter
          params.append('assignee', 'me')
        }

        const res = await fetch(`/api/checks/stats?${params}`)
        const data = await res.json()
        
        if (data.error) {
          console.error('Error fetching stats:', data.error)
        } else {
          setStats(data)
          // Notify parent of total count
          if (onStatsUpdate) {
            onStatsUpdate(data.total || 0)
          }
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [myClientsOnly, canViewAll])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-4 w-24 bg-surface-800 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-surface-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  // Always show stats dashboard, even when total is 0
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-4">
        <p className="text-sm text-surface-400">Total Checks</p>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Overdue</p>
        <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">In Progress</p>
        <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Completed</p>
        <p className="text-2xl font-bold text-brand-400">{stats.completed}</p>
      </div>
    </div>
  )
}

