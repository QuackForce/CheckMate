'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  Filter,
  Play,
} from 'lucide-react'
import { cn, formatDate, getCadenceLabel } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'
import { Combobox } from '@/components/ui/combobox'

interface Check {
  id: string
  client: { id: string; name: string; websiteUrl: string | null }
  assignedEngineer: { id: string; name: string | null } | null
  assignedEngineerName?: string | null
  scheduledDate: string
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
  // Use Google's high-res favicon service
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

export function ChecksListWrapper() {
  const [checks, setChecks] = useState<Check[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const limit = 20

  const fetchChecks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (search) params.append('search', search)
      if (statusFilter !== 'all') params.append('status', statusFilter)

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
  }, [page, search, statusFilter])

  useEffect(() => {
    fetchChecks()
  }, [fetchChecks])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
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
    // If overdue but not status OVERDUE, use overdue styling for icon
    if (overdue && status !== 'OVERDUE') {
      return { ...styles[status], icon: AlertTriangle, iconBadge: 'bg-red-500/20 text-red-400' }
    }
    return styles[status] || styles.SCHEDULED
  }

  // Show empty state with real data message - only when there are truly no checks (no filters/search)
  if (!loading && total === 0 && !search && statusFilter === 'all') {
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

  return (
    <div className={cn("card relative", isStatusFilterOpen && "z-[100]", !isStatusFilterOpen && "overflow-hidden")}>
      {/* Search & Filters Bar */}
      <div className={cn("p-4 border-b border-surface-700/50", isStatusFilterOpen && "overflow-visible")}>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by client name or engineer..."
            className="flex-1 min-w-[280px] max-w-md"
            isLoading={loading && search.length > 0}
          />
          
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-500" />
            <Combobox
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
              placeholder="Filter by status..."
              searchable={false}
              className="w-[130px]"
              onOpenChange={setIsStatusFilterOpen}
            />
          </div>

          {/* Results count */}
          {!loading && (
            <span className="text-sm text-surface-500 ml-auto">
              {total} check{total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
      </div>

      {loading ? (
        /* Skeleton rows instead of spinner */
        <div className="divide-y divide-surface-700/50">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-surface-800 rounded animate-pulse" />
                <div className="h-3 w-32 bg-surface-800 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-surface-800 rounded-full animate-pulse" />
              <div className="h-8 w-16 bg-surface-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : checks.length === 0 ? (
        <div className="py-12 text-center">
          <Filter className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
          <p className="text-surface-400">
            {search || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'No checks match your current filters.'}
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-surface-700/50">
            {checks.map((check) => {
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
                  {/* Status Icon */}
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconBadgeStyle)}>
                    <StatusIcon className="w-5 h-5" />
                  </div>

                  {/* Client & Details */}
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
                      {(check.assignedEngineer?.name || check.assignedEngineerName) && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {check.assignedEngineer?.name || check.assignedEngineerName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2">
                    {/* Show Overdue badge if overdue but status isn't OVERDUE */}
                    {overdue && check.status !== 'OVERDUE' && (
                      <span className="badge bg-red-500/20 text-red-400">
                        OVERDUE
                      </span>
                    )}
                    {/* Status Badge */}
                    <span className={cn('badge', statusStyle.badge)}>
                      {check.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-surface-700/50 flex items-center justify-between">
              <p className="text-sm text-surface-400">
                Showing{' '}
                <span className="font-medium text-white">
                  {(page - 1) * limit + 1}-
                  {Math.min(page * limit, total)}
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

