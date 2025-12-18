'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'

interface ClientStats {
  total: number
  active: number
  onboarding: number
  inactive: number
}

interface ClientsStatsProps {
  myClientsOnly: boolean
}

export function ClientsStats({ myClientsOnly }: ClientsStatsProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canViewAll = hasPermission(userRole, 'clients:view_all')
  
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    active: 0,
    onboarding: 0,
    inactive: 0,
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

        const res = await fetch(`/api/clients/stats?${params}`)
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-4 w-24 bg-surface-800 rounded animate-pulse mb-2" />
            <div className="h-8 w-16 bg-surface-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="card p-4">
        <p className="text-sm text-surface-400">Total Clients</p>
        <p className="text-2xl font-bold text-white">{stats.total}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Active</p>
        <p className="text-2xl font-bold text-brand-400">{stats.active}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Offboarding</p>
        <p className="text-2xl font-bold text-amber-400">{stats.onboarding}</p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-surface-400">Inactive</p>
        <p className="text-2xl font-bold text-surface-500">{stats.inactive}</p>
      </div>
    </div>
  )
}

