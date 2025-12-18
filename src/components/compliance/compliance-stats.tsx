'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Loader2 } from 'lucide-react'

interface ComplianceStats {
  totalAudits: number
  overdueAudits: number
  upcomingAudits: number
  totalReviews: number
  overdueReviews: number
  inProgressReviews: number
  completedReviews: number
}

interface ComplianceStatsProps {
  myClientsOnly: boolean
  activeType: 'audits' | 'reviews'
}

export function ComplianceStats({ myClientsOnly, activeType }: ComplianceStatsProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canViewAll = hasPermission(userRole, 'clients:view_all')
  
  const [stats, setStats] = useState<ComplianceStats>({
    totalAudits: 0,
    overdueAudits: 0,
    upcomingAudits: 0,
    totalReviews: 0,
    overdueReviews: 0,
    inProgressReviews: 0,
    completedReviews: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (canViewAll && myClientsOnly) {
          params.append('assignee', 'me')
        } else if (!canViewAll) {
          params.append('assignee', 'me')
        }

        const res = await fetch(`/api/compliance/stats?${params}`)
        const data = await res.json()
        
        if (data.error) {
          console.error('Error fetching stats:', data.error)
        } else {
          setStats(data)
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
    if (activeType === 'audits') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-4 w-24 bg-surface-800 rounded animate-pulse mb-2" />
              <div className="h-8 w-16 bg-surface-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )
    }
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

  // Show audits stats
  if (activeType === 'audits') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-surface-400">Total Audits</p>
          <p className="text-2xl font-bold text-white">{stats.totalAudits}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-400">Overdue</p>
          <p className="text-2xl font-bold text-red-400">{stats.overdueAudits}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-surface-400">Upcoming</p>
          <p className="text-2xl font-bold text-amber-400">{stats.upcomingAudits}</p>
        </div>
      </div>
    )
  }

  // Show reviews stats
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-4">
        <p className="text-sm text-surface-400">Total Reviews</p>
        <p className="text-2xl font-bold text-white">{stats.totalReviews}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Overdue</p>
        <p className="text-2xl font-bold text-red-400">{stats.overdueReviews}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">In Progress</p>
        <p className="text-2xl font-bold text-amber-400">{stats.inProgressReviews}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Completed</p>
        <p className="text-2xl font-bold text-brand-400">{stats.completedReviews}</p>
      </div>
    </div>
  )
}

