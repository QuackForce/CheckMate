'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Building2, 
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Globe,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  CheckSquare,
  Square,
} from 'lucide-react'
import { cn, getCadenceLabel } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'
import { Combobox } from '@/components/ui/combobox'

interface Client {
  id: string
  name: string
  status: string
  priority: string | null
  slackChannelName: string | null
  defaultCadence: string
  teams: string[]
  pocEmail: string | null
  websiteUrl: string | null
  itGlueUrl: string | null
  primaryEngineer: { id: string; name: string; email: string; image: string | null } | null
  secondaryEngineer: { id: string; name: string; email: string; image: string | null } | null
  systemEngineerName?: string | null
  infraCheckAssigneeName?: string | null
  infraCheckAssigneeUser?: { id: string; name: string | null; email: string | null; image: string | null } | null
  assignments?: Array<{
    id: string
    userId: string
    role: string
    user: {
      id: string
      name: string | null
      email: string | null
      image: string | null
    }
  }>
}

const CLIENTS_PER_PAGE = 25

// Extract domain from URL
function getDomain(url: string | null): string | null {
  if (!url) return null
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

// Get logo URL from domain using Google's favicon service
function getLogoUrl(websiteUrl: string | null): string | null {
  const domain = getDomain(websiteUrl)
  if (!domain) return null
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

export function ClientsTableWrapper() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)

  // Read URL query parameters
  const assigneeParam = searchParams.get('assignee')
  const managerTeamParam = searchParams.get('managerTeam')
  
  // Initialize checkbox state from URL param
  const [showMyClientsOnly, setShowMyClientsOnly] = useState(assigneeParam === 'me')
  
  // Sync checkbox with URL param changes
  useEffect(() => {
    setShowMyClientsOnly(assigneeParam === 'me')
  }, [assigneeParam])
  
  // If showMyClientsOnly is true, use 'me' as assignee, otherwise use URL param
  const effectiveAssignee = showMyClientsOnly ? 'me' : assigneeParam
  
  // Handle checkbox toggle - update URL
  const handleMyClientsToggle = () => {
    const newValue = !showMyClientsOnly
    setShowMyClientsOnly(newValue)
    setPage(1) // Reset to first page when toggling
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (newValue) {
      params.set('assignee', 'me')
    } else {
      params.delete('assignee')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const totalPages = Math.ceil(total / CLIENTS_PER_PAGE)

  // Get filter label for active filters
  const getActiveFilterLabel = () => {
    if (managerTeamParam === 'se') return 'SE Manager Team'
    if (managerTeamParam === 'grc') return 'GRC Manager Team'
    if (managerTeamParam?.startsWith('consultant-team-')) {
      const teamNum = managerTeamParam.replace('consultant-team-', '')
      return `Consultant Team ${teamNum}`
    }
    return null
  }

  const activeFilterLabel = getActiveFilterLabel()

  // Fetch clients with pagination
  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: CLIENTS_PER_PAGE.toString(),
      })
      
      if (search) {
        params.set('search', search)
      }
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      // Add URL query parameters
      if (effectiveAssignee) {
        params.set('assignee', effectiveAssignee)
      }
      
      if (managerTeamParam) {
        params.set('managerTeam', managerTeamParam)
      }

      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      
      if (data.clients) {
        setClients(data.clients)
        setTotal(data.pagination?.total || data.clients.length)
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, effectiveAssignee, managerTeamParam])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        setSearch(searchInput)
        setPage(1) // Reset to first page on search
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1) // Reset to first page on filter change
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-brand-500/20 text-brand-400',
      INACTIVE: 'bg-surface-700 text-surface-400',
      ONBOARDING: 'bg-blue-500/20 text-blue-400',
      OFFBOARDING: 'bg-amber-500/20 text-amber-400',
      ON_HOLD: 'bg-red-500/20 text-red-400',
      EXITING: 'bg-orange-500/20 text-orange-400',
      AS_NEEDED: 'bg-purple-500/20 text-purple-400',
    }
    return styles[status] || 'bg-surface-700 text-surface-400'
  }

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null
    const styles: Record<string, string> = {
      P1: 'bg-red-500/20 text-red-400',
      P2: 'bg-orange-500/20 text-orange-400',
      P3: 'bg-yellow-500/20 text-yellow-400',
      P4: 'bg-surface-700 text-surface-400',
    }
    return styles[priority] || 'bg-surface-700 text-surface-400'
  }

  return (
    <div className={cn("card relative", isStatusFilterOpen && "z-[100]", !isStatusFilterOpen && "overflow-hidden")}>
      {/* Search & Filters Bar */}
      <div className={cn("p-4 border-b border-surface-700/50", isStatusFilterOpen && "overflow-visible")}>
        {/* Active filter badge */}
        {activeFilterLabel && (
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-sm border border-brand-500/30">
              <Filter className="w-3.5 h-3.5" />
              {activeFilterLabel}
              <Link
                href="/clients"
                className="hover:text-brand-300 transition-colors"
                title="Clear filter"
              >
                <X className="w-3.5 h-3.5" />
              </Link>
            </span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email, team, or engineer..."
            className="flex-1 min-w-[280px] max-w-md"
            isLoading={loading && searchInput !== search}
          />
          
          {/* Quick filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-500" />
            <Combobox
              value={statusFilter}
              onChange={(value) => handleStatusChange(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'OFFBOARDING', label: 'Offboarding' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'ON_HOLD', label: 'On Hold' },
              ]}
              placeholder="Filter by status..."
              searchable={false}
              className="w-[130px]"
              onOpenChange={setIsStatusFilterOpen}
            />
          </div>

          {/* My Clients Only Checkbox - moved to right */}
          <button
            onClick={handleMyClientsToggle}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              showMyClientsOnly
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30 hover:bg-brand-500/20'
                : 'text-surface-400 border-surface-700 hover:bg-surface-800 hover:text-white'
            )}
          >
            {showMyClientsOnly ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">My Clients Only</span>
          </button>

          {/* Results count */}
          {!loading && (
            <span className="text-sm text-surface-500 ml-auto">
              {total} client{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        /* Skeleton rows instead of spinner */
        <div className="divide-y divide-surface-700/50">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-800 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-surface-800 rounded animate-pulse" />
                <div className="h-3 w-24 bg-surface-800 rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-surface-800 rounded animate-pulse" />
              <div className="h-6 w-12 bg-surface-800 rounded animate-pulse" />
              <div className="h-6 w-16 bg-surface-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-800/50">
                <tr>
                  <th className="table-header table-cell">Client</th>
                  <th className="table-header table-cell">Status</th>
                  <th className="table-header table-cell">Priority</th>
                  <th className="table-header table-cell">Teams</th>
                  <th className="table-header table-cell">Cadence</th>
                  <th className="table-header table-cell">Infra Check</th>
                  <th className="table-header table-cell w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-cell">
                      <div className="py-12 text-center">
                        <Filter className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
                        <p className="text-surface-400">
                          {search || statusFilter !== 'all' 
                            ? 'Try adjusting your search or filter criteria.'
                            : 'No clients match your current filters.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-surface-800/30 transition-colors"
                  >
                    {/* Client name */}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {getLogoUrl(client.websiteUrl) ? (
                          <div className="w-10 h-10 rounded-lg bg-white p-1.5 flex items-center justify-center flex-shrink-0">
                            <img 
                              src={getLogoUrl(client.websiteUrl)!} 
                              alt=""
                              className="w-full h-full object-contain"
                              loading="lazy"
                              onError={(e) => {
                                // Silently handle errors (ad blockers, network issues, etc.)
                                e.currentTarget.style.display = 'none'
                                const parent = e.currentTarget.parentElement
                                if (parent) {
                                  parent.innerHTML = '<svg class="w-5 h-5 text-surface-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>'
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-surface-400" />
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-medium text-white hover:text-brand-400 transition-colors"
                          >
                            {client.name}
                          </Link>
                          {getDomain(client.websiteUrl) && (
                            <div className="flex items-center gap-1 text-xs text-surface-500 mt-0.5">
                              <Globe className="w-3 h-3" />
                              {getDomain(client.websiteUrl)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="table-cell">
                      <span className={cn('badge', getStatusBadge(client.status))}>
                        {client.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="table-cell">
                      {client.priority ? (
                        <span className={cn('badge', getPriorityBadge(client.priority))}>
                          {client.priority}
                        </span>
                      ) : (
                        <span className="text-surface-500">—</span>
                      )}
                    </td>

                    {/* Teams */}
                    <td className="table-cell">
                      {client.teams && client.teams.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.teams.slice(0, 2).map((team) => (
                            <span
                              key={team}
                              className="px-2 py-0.5 text-xs rounded bg-surface-700 text-surface-300"
                            >
                              {team}
                            </span>
                          ))}
                          {client.teams.length > 2 && (
                            <span className="text-xs text-surface-500">
                              +{client.teams.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-surface-500">—</span>
                      )}
                    </td>

                    {/* Cadence */}
                    <td className="table-cell">
                      <span className="text-surface-300">
                        {getCadenceLabel(client.defaultCadence)}
                      </span>
                    </td>

                    {/* Infra Check Assignee */}
                    <td className="table-cell">
                      {(() => {
                        // Priority: 1) infraCheckAssigneeName override, 2) SE from assignments table, 3) legacy systemEngineerName
                        const seAssignments = client.assignments?.filter(a => a.role === 'SE') || []
                        const seFromAssignments = seAssignments.length > 0 ? seAssignments[0].user.name : null
                        const assignee = client.infraCheckAssigneeName || seFromAssignments || client.systemEngineerName
                        const isOverride = client.infraCheckAssigneeName && 
                          client.infraCheckAssigneeName !== seFromAssignments &&
                          client.infraCheckAssigneeName !== client.systemEngineerName
                        const seUserFromAssignments = seAssignments.length > 0 ? seAssignments[0].user : null
                        const avatarImage = client.infraCheckAssigneeUser?.image || seUserFromAssignments?.image || null
                        
                        if (assignee) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0">
                                {avatarImage ? (
                                  <img
                                    src={avatarImage}
                                    alt={assignee}
                                    className="w-7 h-7 rounded-full object-cover"
                                    title={isOverride ? `${assignee} (override)` : assignee}
                                  />
                                ) : (
                                  <div
                                    className={cn(
                                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white',
                                      isOverride ? 'bg-amber-600' : 'bg-brand-600'
                                    )}
                                    title={isOverride ? `${assignee} (override)` : assignee}
                                  >
                                    {assignee.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <span className="text-sm text-surface-300 truncate max-w-[120px]">
                                {assignee.split(' ')[0]}
                              </span>
                            </div>
                          )
                        }
                        return <span className="text-surface-500 text-sm">Unassigned</span>
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="table-cell">
                      <div className="relative group">
                        <button className="p-2 hover:bg-surface-700 rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-surface-400" />
                        </button>
                        
                        {/* Dropdown menu */}
                        <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <Link
                            href={`/clients/${client.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Details
                          </Link>
                          {client.itGlueUrl && (
                            <a
                              href={client.itGlueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                            >
                              <Globe className="w-4 h-4" />
                              IT Glue
                            </a>
                          )}
                          <Link
                            href={`/checks/new?client=${client.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
                          >
                            <Calendar className="w-4 h-4" />
                            Schedule Check
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-surface-700/50 flex items-center justify-between">
              <span className="text-sm text-surface-500">
                Showing {((page - 1) * CLIENTS_PER_PAGE) + 1} - {Math.min(page * CLIENTS_PER_PAGE, total)} of {total}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-surface-400" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                          page === pageNum
                            ? 'bg-brand-500 text-white'
                            : 'text-surface-400 hover:bg-surface-700 hover:text-white'
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-surface-400" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
