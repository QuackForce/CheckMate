'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  User,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  Users,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'
import { hasPermission } from '@/lib/permissions'

interface Check {
  id: string
  Client: { id: string; name: string; websiteUrl: string | null }
  User_InfraCheck_assignedEngineerIdToUser: { id: string; name: string | null } | null
  assignedEngineerName?: string | null
  scheduledDate: string
  completedAt?: string | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED'
  notes: string | null
}

// Helper to extract domain from URL
function getDomain(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null
  try {
    const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

// Get logo URL from domain using Google's favicon service
function getLogoUrl(websiteUrl: string | null): string | null {
  const domain = getDomain(websiteUrl)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

// Group checks by date ranges for Upcoming tab
function groupByDateRange(checks: Check[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextMonth = new Date(today)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const groups: Record<string, Check[]> = {
    'This Week': [],
    'Next Week': [],
    'This Month': [],
    'Next Month': [],
    'Later': [],
  }

  checks.forEach(check => {
    const checkDate = new Date(check.scheduledDate)
    checkDate.setHours(0, 0, 0, 0)

    if (checkDate < tomorrow) {
      // Shouldn't happen in upcoming, but handle it
      groups['This Week'].push(check)
    } else if (checkDate < nextWeek) {
      groups['This Week'].push(check)
    } else if (checkDate < nextMonth) {
      const weekStart = new Date(tomorrow)
      weekStart.setDate(weekStart.getDate() + 7)
      if (checkDate < weekStart) {
        groups['Next Week'].push(check)
      } else {
        groups['This Month'].push(check)
      }
    } else {
      const monthStart = new Date(nextMonth)
      monthStart.setMonth(monthStart.getMonth() + 1)
      if (checkDate < monthStart) {
        groups['Next Month'].push(check)
      } else {
        groups['Later'].push(check)
      }
    }
  })

  return groups
}

// Group completed checks by client (2-3 most recent per client)
function groupCompletedByClient(checks: Check[]) {
  const byClient = new Map<string, Check[]>()
  
  checks.forEach(check => {
    const clientId = check.Client.id
    if (!byClient.has(clientId)) {
      byClient.set(clientId, [])
    }
    byClient.get(clientId)!.push(check)
  })

  // Sort each client's checks by completed date (most recent first)
  // Then limit to 2-3 most recent per client
  const grouped: Array<{ clientId: string; clientName: string; checks: Check[] }> = []
  
  for (const [clientId, clientChecks] of Array.from(byClient.entries())) {
    const sorted = clientChecks.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
      return dateB - dateA
    })
    
    grouped.push({
      clientId,
      clientName: clientChecks[0].Client.name,
      checks: sorted.slice(0, 3), // Show 2-3 most recent
    })
  }

  // Sort groups by most recent check date
  grouped.sort((a, b) => {
    const dateA = a.checks[0]?.completedAt ? new Date(a.checks[0].completedAt).getTime() : 0
    const dateB = b.checks[0]?.completedAt ? new Date(b.checks[0].completedAt).getTime() : 0
    return dateB - dateA
  })

  return grouped
}

export function ChecksListWrapper() {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canViewAll = hasPermission(userRole, 'checks:view_all')
  
  const [checks, setChecks] = useState<Check[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed' | 'all'>('active')
  const [myClientsOnly, setMyClientsOnly] = useState(!canViewAll) // Default: ON for engineers, OFF for managers

  // Notify parent component when filter changes
  useEffect(() => {
    const event = new CustomEvent('checks-filter-change', { detail: myClientsOnly })
    window.dispatchEvent(event)
  }, [myClientsOnly])
  const limit = 50 // Increased for better grouping

  const fetchChecks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        tab: activeTab,
      })
      if (search) params.append('search', search)
      if (myClientsOnly) params.append('assignee', 'me')

      const res = await fetch(`/api/checks?${params}`)
      const data = await res.json()
      
      if (data.checks) {
        setChecks(data.checks)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotal(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch checks:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, activeTab, myClientsOnly])

  useEffect(() => {
    fetchChecks()
  }, [fetchChecks])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleTabChange = useCallback((tab: typeof activeTab) => {
    setActiveTab(tab)
    setPage(1)
  }, [])

  // Check if a date is in the past (overdue)
  const isOverdue = (dateStr: string, status: string) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') return false
    const today = new Date()
    const checkDate = new Date(dateStr)
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const scheduledDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate())
    return scheduledDate < todayDate
  }

  const getStatusStyles = (status: string, overdue: boolean = false) => {
    const styles: Record<string, { badge: string; icon: typeof Clock }> = {
      SCHEDULED: { badge: 'bg-blue-500/20 text-blue-400', icon: Calendar },
      IN_PROGRESS: { badge: 'bg-amber-500/20 text-amber-400', icon: Play },
      COMPLETED: { badge: 'bg-brand-500/20 text-brand-400', icon: CheckCircle2 },
      OVERDUE: { badge: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
      CANCELLED: { badge: 'bg-surface-700 text-surface-400', icon: Clock },
    }
    if (overdue && status !== 'OVERDUE') {
      return { ...styles[status], icon: AlertTriangle, iconBadge: 'bg-red-500/20 text-red-400' }
    }
    return styles[status] || styles.SCHEDULED
  }

  // Sort active checks by priority: Overdue → In Progress → Today
  const sortedActiveChecks = [...checks].sort((a, b) => {
    const aOverdue = isOverdue(a.scheduledDate, a.status)
    const bOverdue = isOverdue(b.scheduledDate, b.status)
    
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    
    if (a.status === 'IN_PROGRESS' && b.status !== 'IN_PROGRESS') return -1
    if (a.status !== 'IN_PROGRESS' && b.status === 'IN_PROGRESS') return 1
    
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  })

  // Render check item
  const renderCheckItem = (check: Check) => {
    const overdue = isOverdue(check.scheduledDate, check.status)
    const statusStyle = getStatusStyles(check.status, overdue)
    const StatusIcon = statusStyle.icon
    const iconBadgeStyle = (statusStyle as any).iconBadge || statusStyle.badge

    return (
      <Link
        key={check.id}
        href={`/checks/${check.id}`}
        className={cn(
          'flex items-center gap-4 p-4 hover:bg-surface-800/30 transition-colors',
          overdue && 'bg-red-500/5'
        )}
      >
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBadgeStyle)}>
          <StatusIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {getLogoUrl(check.Client.websiteUrl) ? (
              <img 
                src={getLogoUrl(check.Client.websiteUrl)!} 
                alt=""
                className="w-5 h-5 rounded bg-white p-0.5 object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <Building2 className="w-4 h-4 text-surface-500" />
            )}
            <span className="font-medium text-white truncate">
              {check.Client.name}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(new Date(check.scheduledDate))}
            </span>
            {(check.User_InfraCheck_assignedEngineerIdToUser?.name || check.assignedEngineerName) && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {check.User_InfraCheck_assignedEngineerIdToUser?.name || check.assignedEngineerName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {overdue && check.status !== 'OVERDUE' && (
            <span className="badge bg-red-500/20 text-red-400">
              OVERDUE
            </span>
          )}
          <span className={cn('badge', statusStyle.badge)}>
            {check.status.replace('_', ' ')}
          </span>
        </div>
      </Link>
    )
  }

  // Show empty state only when truly no checks exist (not filtered)
  // Don't show this if user has filtered to "My Clients" and has no checks
  if (!loading && total === 0 && !search && activeTab === 'active' && !myClientsOnly) {
    return (
      <div className="card p-12 text-center">
        <Calendar className="w-12 h-12 text-surface-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No checks scheduled yet</h3>
        <p className="text-surface-400 mb-6">
          Schedule infrastructure checks for your clients to get started.
        </p>
        <Link href="/checks/new" className="btn-primary inline-flex">
          Schedule First Check
        </Link>
      </div>
    )
  }

  const tabs = [
    { id: 'active' as const, label: 'Active', count: activeTab === 'active' ? total : undefined },
    { id: 'upcoming' as const, label: 'Upcoming', count: activeTab === 'upcoming' ? total : undefined },
    { id: 'completed' as const, label: 'Completed', count: activeTab === 'completed' ? total : undefined },
    ...(canViewAll ? [{ id: 'all' as const, label: 'All', count: activeTab === 'all' ? total : undefined }] : []),
  ]

  return (
    <div className="card">
      {/* Tabs */}
      <div className="border-b border-surface-700/50">
        <div className="flex items-center gap-1 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  activeTab === tab.id
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'bg-surface-600 text-surface-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by client name or engineer..."
            className="flex-1 min-w-[280px] max-w-md"
            isLoading={loading && search.length > 0}
          />
          
          {/* My Clients Toggle - Only show if user can view all */}
          {canViewAll && (
            <button
              onClick={() => {
                const newValue = !myClientsOnly
                setMyClientsOnly(newValue)
                // Notify parent component when filter changes
                const event = new CustomEvent('checks-filter-change', { detail: newValue })
                window.dispatchEvent(event)
                // Update URL to keep in sync
                const params = new URLSearchParams(window.location.search)
                if (newValue) {
                  params.set('assignee', 'me')
                } else {
                  params.delete('assignee')
                }
                window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`)
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                myClientsOnly
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
              )}
            >
              <Users className="w-4 h-4" />
              My Clients
            </button>
          )}

          {!loading && (
            <span className="text-sm text-surface-500 ml-auto">
              {total} check{total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-surface-700/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-surface-800 rounded animate-pulse" />
                <div className="h-3 w-32 bg-surface-800 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-surface-800 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : checks.length === 0 ? (
        <div className="py-12 text-center">
          <Calendar className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No checks found</h3>
          <p className="text-surface-400">
            {search
              ? 'Try adjusting your search criteria.'
              : myClientsOnly
              ? 'You don\'t have any checks assigned to your clients. Try turning off "My Clients" to see all checks.'
              : 'No checks match your current filters.'}
          </p>
          {myClientsOnly && canViewAll && (
            <button
              onClick={() => setMyClientsOnly(false)}
              className="btn-secondary mt-4 inline-flex"
            >
              Show All Checks
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active Tab - Flat list */}
          {activeTab === 'active' && (
            <div className="divide-y divide-surface-700/50">
              {sortedActiveChecks.map(renderCheckItem)}
            </div>
          )}

          {/* Upcoming Tab - Grouped by date */}
          {activeTab === 'upcoming' && (() => {
            const dateGroups = groupByDateRange(checks)
            const hasAnyChecks = Object.values(dateGroups).some(group => group.length > 0)
            
            if (!hasAnyChecks) {
              return (
                <div className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No upcoming checks</h3>
                </div>
              )
            }

            return (
              <div className="divide-y divide-surface-700/50">
                {Object.entries(dateGroups).map(([range, rangeChecks]) => {
                  if (rangeChecks.length === 0) return null
                  
                  return (
                    <div key={range}>
                      <div className="px-4 py-2 bg-surface-800/30 border-b border-surface-700/50">
                        <h3 className="text-sm font-medium text-surface-300">{range}</h3>
                        <p className="text-xs text-surface-500 mt-0.5">{rangeChecks.length} check{rangeChecks.length !== 1 ? 's' : ''}</p>
                      </div>
                      {rangeChecks.map(renderCheckItem)}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Completed Tab - Grouped by client */}
          {activeTab === 'completed' && (() => {
            const clientGroups = groupCompletedByClient(checks)
            
            if (clientGroups.length === 0) {
              return (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No completed checks</h3>
                </div>
              )
            }

            return (
              <div className="divide-y divide-surface-700/50">
                {clientGroups.map(({ clientId, clientName, checks: clientChecks }) => (
                  <div key={clientId}>
                    <div className="px-4 py-3 bg-surface-800/30 border-b border-surface-700/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-white">{clientName}</h3>
                          <p className="text-xs text-surface-500 mt-0.5">
                            {clientChecks.length} most recent check{clientChecks.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Link
                          href={`/clients/${clientId}`}
                          className="text-xs text-brand-400 hover:text-brand-300"
                        >
                          View Client →
                        </Link>
                      </div>
                    </div>
                    {clientChecks.map(renderCheckItem)}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* All Tab - Flat list */}
          {activeTab === 'all' && (
            <div className="divide-y divide-surface-700/50">
              {checks.map(renderCheckItem)}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-surface-700/50 flex items-center justify-between">
              <p className="text-sm text-surface-400">
                Showing{' '}
                <span className="font-medium text-white">
                  {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
                </span>{' '}
                of <span className="font-medium text-white">{total}</span> checks
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-ghost text-sm flex items-center gap-1 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
