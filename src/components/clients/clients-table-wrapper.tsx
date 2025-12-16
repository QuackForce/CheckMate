'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  ChevronDown,
  Users,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn, getCadenceLabel } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'
import { Combobox } from '@/components/ui/combobox'
import { useIsMobile } from '@/hooks/use-mobile'

interface Client {
  id: string
  name: string
  status: string
  priority: string | null
  slackChannelName: string | null
  defaultCadence: string
  teams: string[] // Legacy field - kept for backward compatibility
  teamAssignments?: Array<{
    id: string
    teamId: string
    team: {
      id: string
      name: string
      description: string | null
      color: string | null
      tag: string | null
    }
  }>
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

const CLIENTS_PER_PAGE = 12

// Client Actions Menu Component
function ClientActionsMenu({ client }: { client: Client }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Position dropdown using fixed positioning
  useEffect(() => {
    if (!isOpen || !buttonRef.current || !dropdownRef.current) return

    const updatePosition = () => {
      if (!buttonRef.current || !dropdownRef.current) return
      
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdown = dropdownRef.current
      const dropdownWidth = 192 // w-48 = 12rem = 192px
      const dropdownHeight = dropdown.offsetHeight || 150 // Estimate if not rendered yet
      
      // Calculate position
      let top = rect.bottom + 4
      let left = rect.right - dropdownWidth
      
      // Adjust if would go off right edge
      if (left < 8) {
        left = 8
      }
      
      // Adjust if would go off left edge
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8
      }
      
      // Adjust if would go off bottom edge
      if (top + dropdownHeight > window.innerHeight - 8) {
        top = rect.top - dropdownHeight - 4
      }
      
      dropdown.style.top = `${top}px`
      dropdown.style.left = `${left}px`
    }

    // Small delay to ensure dropdown is rendered
    const timeoutId = setTimeout(updatePosition, 0)
    updatePosition()
    
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [isOpen])

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-surface-400" />
        </button>
      </div>

      {/* Dropdown menu - Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-48 py-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl" 
          style={{ 
            position: 'fixed',
            zIndex: 999999,
            pointerEvents: 'auto',
            isolation: 'isolate',
            top: 0,
            left: 0
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            href={`/clients/${client.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 transition-colors"
            onClick={() => setIsOpen(false)}
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
            onClick={() => setIsOpen(false)}
          >
            <Calendar className="w-4 h-4" />
            Schedule Check
          </Link>
        </div>,
        document.body
      )}
    </>
  )
}

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
  const isMobile = useIsMobile()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  // Column filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [cadenceFilter, setCadenceFilter] = useState<string>('all')
  const [infraCheckAssigneeFilter, setInfraCheckAssigneeFilter] = useState<string>('all')
  const [clientSort, setClientSort] = useState<string>('default')
  
  // Available options for filters
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string; tag: string | null }>>([])
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string | null; email: string | null }>>([])

  // Read URL query parameters
  const assigneeParam = searchParams.get('assignee')
  const managerTeamParam = searchParams.get('managerTeam')
  
  // Fetch available teams and users for filters
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [teamsRes, usersRes] = await Promise.all([
          fetch('/api/teams'),
          fetch('/api/users?limit=200'),
        ])
        
        if (teamsRes.ok) {
          const teams = await teamsRes.json()
          const activeTeams = teams.filter((t: any) => t.isActive !== false)
          setAvailableTeams(activeTeams)
        }
        
        if (usersRes.ok) {
          const data = await usersRes.json()
          const users = data.users || data || []
          setAvailableUsers(users.filter((u: any) => u.name || u.email))
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error)
      }
    }
    
    fetchFilterOptions()
  }, [])
  
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
  
  // Get active column filter labels
  const getActiveColumnFilters = () => {
    const active: Array<{ key: string; label: string; onClear: () => void }> = []
    
    if (statusFilter !== 'all') {
      active.push({
        key: 'status',
        label: `Status: ${statusFilter.replace('_', ' ')}`,
        onClear: () => {
          setStatusFilter('all')
          setPage(1)
        },
      })
    }
    
    if (clientSort !== 'default') {
      active.push({
        key: 'sort',
        label: `Sort: ${clientSort === 'az' ? 'A-Z' : 'Z-A'}`,
        onClear: () => {
          setClientSort('default')
          setPage(1)
        },
      })
    }
    
    if (priorityFilter !== 'all') {
      const label = priorityFilter === 'none' ? 'No Priority' : priorityFilter
      active.push({
        key: 'priority',
        label: `Priority: ${label}`,
        onClear: () => {
          setPriorityFilter('all')
          setPage(1)
        },
      })
    }
    
    if (teamFilter !== 'all') {
      const team = availableTeams.find(t => t.id === teamFilter)
      active.push({
        key: 'team',
        label: `Team: ${team?.tag || team?.name || 'Unknown'}`,
        onClear: () => {
          setTeamFilter('all')
          setPage(1)
        },
      })
    }
    
    if (cadenceFilter !== 'all') {
      active.push({
        key: 'cadence',
        label: `Cadence: ${getCadenceLabel(cadenceFilter)}`,
        onClear: () => {
          setCadenceFilter('all')
          setPage(1)
        },
      })
    }
    
    if (infraCheckAssigneeFilter !== 'all') {
      const user = availableUsers.find(u => u.id === infraCheckAssigneeFilter)
      active.push({
        key: 'infraCheck',
        label: `Assignee: ${user?.name || user?.email || 'Unknown'}`,
        onClear: () => {
          setInfraCheckAssigneeFilter('all')
          setPage(1)
        },
      })
    }
    
    return active
  }
  
  const activeColumnFilters = getActiveColumnFilters()

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
      
      if (priorityFilter !== 'all') {
        params.set('priority', priorityFilter)
      }
      
      if (teamFilter !== 'all') {
        params.set('teamId', teamFilter)
      }
      
      if (cadenceFilter !== 'all') {
        params.set('cadence', cadenceFilter)
      }
      
      if (infraCheckAssigneeFilter !== 'all') {
        params.set('infraCheckAssignee', infraCheckAssigneeFilter)
      }
      
      if (clientSort !== 'default') {
        params.set('sort', clientSort)
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
  }, [page, search, statusFilter, priorityFilter, teamFilter, cadenceFilter, infraCheckAssigneeFilter, clientSort, effectiveAssignee, managerTeamParam])

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
    <div className="card relative overflow-hidden">
      {/* Search & Filters Bar */}
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email, team, or engineer..."
            className="flex-1 min-w-[280px] max-w-md"
            isLoading={loading && searchInput !== search}
          />

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
        
        {/* Active filter badges */}
        {(activeFilterLabel || activeColumnFilters.length > 0) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {activeFilterLabel && (
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
            )}
            {activeColumnFilters.map(filter => (
              <span
                key={filter.key}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-sm border border-brand-500/30"
              >
                <Filter className="w-3.5 h-3.5" />
                {filter.label}
                <button
                  onClick={filter.onClear}
                  className="hover:text-brand-300 transition-colors"
                  title="Clear filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
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
      ) : isMobile ? (
        /* Mobile Card View */
        <div className="divide-y divide-surface-700/50">
          {clients.length === 0 ? (
            <div className="py-12 text-center">
              <Filter className="w-12 h-12 text-surface-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
              <p className="text-surface-400">
                {search || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No clients match your current filters.'}
              </p>
            </div>
          ) : (
            clients.map((client) => {
              // Get assignee info (filter out orphaned assignments where user is null)
              const validAssignments = client.assignments?.filter((a: any) => a.User !== null) || []
              const seAssignments = validAssignments.filter(a => a.role === 'SE') || []
              const seFromAssignments = seAssignments.length > 0 ? seAssignments[0].User?.name : null
              const assignee = client.infraCheckAssigneeName || seFromAssignments || client.systemEngineerName
              const seUserFromAssignments = seAssignments.length > 0 ? seAssignments[0].User : null
              const avatarImage = client.infraCheckAssigneeUser?.image || seUserFromAssignments?.image || null

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="block p-4 hover:bg-surface-800/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Logo/Icon */}
                    {getLogoUrl(client.websiteUrl) ? (
                      <div className="w-12 h-12 rounded-lg bg-white p-1.5 flex items-center justify-center flex-shrink-0">
                        <img 
                          src={getLogoUrl(client.websiteUrl)!} 
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.innerHTML = '<svg class="w-6 h-6 text-surface-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>'
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface-700/50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-surface-400" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white truncate">{client.name}</h3>
                          {getDomain(client.websiteUrl) && (
                            <div className="flex items-center gap-1 text-xs text-surface-500 mt-0.5">
                              <Globe className="w-3 h-3" />
                              <span className="truncate">{getDomain(client.websiteUrl)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('badge text-xs', getStatusBadge(client.status))}>
                            {client.status.replace('_', ' ')}
                          </span>
                          {client.priority && (
                            <span className={cn('badge text-xs', getPriorityBadge(client.priority))}>
                              {client.priority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Teams */}
                      {client.teamAssignments && client.teamAssignments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {client.teamAssignments.slice(0, 2).map((teamAssignment) => {
                            const tag = teamAssignment.team.tag || teamAssignment.team.name
                            const color = teamAssignment.team.color || '#64748b'
                            return (
                              <span
                                key={teamAssignment.id}
                                className="px-2 py-0.5 text-xs rounded border"
                                style={{
                                  backgroundColor: `${color}20`,
                                  color: color,
                                  borderColor: `${color}30`,
                                }}
                              >
                                {tag}
                              </span>
                            )
                          })}
                          {client.teamAssignments.length > 2 && (
                            <span className="text-xs text-surface-500">
                              +{client.teamAssignments.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom row: Cadence, Assignee */}
                      <div className="flex items-center justify-between gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-surface-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{getCadenceLabel(client.defaultCadence)}</span>
                        </div>
                        {assignee && (
                          <div className="flex items-center gap-1.5 text-xs text-surface-300">
                            {avatarImage ? (
                              <img
                                src={avatarImage}
                                alt={assignee}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center text-[10px] font-medium text-white">
                                {assignee.charAt(0)}
                              </div>
                            )}
                            <span className="truncate max-w-[100px]">{assignee.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}

          {/* Pagination for Mobile */}
          {totalPages > 1 && (
            <div className="px-4 pt-4 pb-2 border-t border-surface-700/50 flex flex-col items-center gap-3">
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
        </div>
      ) : (
        <>
          <table className="w-full border-collapse">
              <thead className="bg-surface-800/50">
                <tr>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <span>Client</span>
                      <div className="column-filter-container">
                        <Combobox
                          value={clientSort}
                          onChange={(val) => {
                            setClientSort(val || 'default')
                            setPage(1)
                          }}
                          options={[
                            { value: 'default', label: 'Default' },
                            { value: 'az', label: 'A-Z' },
                            { value: 'za', label: 'Z-A' },
                          ]}
                          placeholder="Sort"
                          searchable={false}
                          className={cn(
                            "text-xs h-7",
                            clientSort !== 'default' && "border-brand-500/50"
                          )}
                          showChevron={true}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <span>Status</span>
                      <div className="column-filter-container">
                        <Combobox
                          value={statusFilter}
                          onChange={(val) => {
                            setStatusFilter(val || 'all')
                            setPage(1)
                          }}
                          options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'ACTIVE', label: 'Active' },
                            { value: 'OFFBOARDING', label: 'Offboarding' },
                            { value: 'INACTIVE', label: 'Inactive' },
                            { value: 'ON_HOLD', label: 'On Hold' },
                            { value: 'ONBOARDING', label: 'Onboarding' },
                            { value: 'EXITING', label: 'Exiting' },
                            { value: 'AS_NEEDED', label: 'As Needed' },
                          ]}
                          placeholder="All"
                          searchable={false}
                          className={cn(
                            "text-xs h-7",
                            statusFilter !== 'all' && "border-brand-500/50"
                          )}
                          showChevron={true}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <span>Priority</span>
                      <div className="column-filter-container">
                        <Combobox
                          value={priorityFilter}
                          onChange={(val) => {
                            setPriorityFilter(val || 'all')
                            setPage(1)
                          }}
                          options={[
                            { value: 'all', label: 'All Priorities' },
                            { value: 'P1', label: 'P1' },
                            { value: 'P2', label: 'P2' },
                            { value: 'P3', label: 'P3' },
                            { value: 'P4', label: 'P4' },
                            { value: 'none', label: 'No Priority' },
                          ]}
                          placeholder="All"
                          searchable={false}
                          className={cn(
                            "text-xs h-7",
                            priorityFilter !== 'all' && "border-brand-500/50"
                          )}
                          showChevron={true}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <span>Teams</span>
                      <div className="column-filter-container">
                        <Combobox
                          value={teamFilter}
                          onChange={(val) => {
                            setTeamFilter(val || 'all')
                            setPage(1)
                          }}
                          options={[
                            { value: 'all', label: 'All Teams' },
                            ...availableTeams.map(t => ({
                              value: t.id,
                              label: t.tag || t.name,
                            })),
                          ]}
                          placeholder="All"
                          searchable={true}
                          className={cn(
                            "text-xs h-7",
                            teamFilter !== 'all' && "border-brand-500/50"
                          )}
                          showChevron={true}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <span>Cadence</span>
                      <div className="column-filter-container">
                        <Combobox
                          value={cadenceFilter}
                          onChange={(val) => {
                            setCadenceFilter(val || 'all')
                            setPage(1)
                          }}
                          options={[
                            { value: 'all', label: 'All Cadences' },
                            { value: 'WEEKLY', label: 'Weekly' },
                            { value: 'BIWEEKLY', label: 'Biweekly' },
                            { value: 'MONTHLY', label: 'Monthly' },
                            { value: 'QUARTERLY', label: 'Quarterly' },
                            { value: 'CUSTOM', label: 'Custom' },
                          ]}
                          placeholder="All"
                          searchable={false}
                          className={cn(
                            "text-xs h-7",
                            cadenceFilter !== 'all' && "border-brand-500/50"
                          )}
                          showChevron={true}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider">
                    <div className="flex flex-col gap-1">
                      <span>Infra Check</span>
                      <div className="column-filter-container">
                        <Combobox
                          value={infraCheckAssigneeFilter}
                          onChange={(val) => {
                            setInfraCheckAssigneeFilter(val || 'all')
                            setPage(1)
                          }}
                          options={[
                            { value: 'all', label: 'All Assignees' },
                            ...availableUsers.map(u => ({
                              value: u.id,
                              label: u.name || u.email || 'Unknown',
                            })),
                          ]}
                          placeholder="All"
                          searchable={true}
                          className={cn(
                            "text-xs h-7",
                            infraCheckAssigneeFilter !== 'all' && "border-brand-500/50"
                          )}
                          showChevron={true}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="table-header py-3 px-4 text-xs font-medium text-surface-400 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/50" style={{ overflow: 'visible' }}>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 px-4 text-sm">
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
                  clients.map((client, index) => (
                  <tr
                    key={client.id}
                    className={cn(
                      "hover:bg-surface-800/30 transition-colors",
                      index === clients.length - 1 && "last-row-no-padding"
                    )}
                    style={{ overflow: 'visible' }}
                  >
                    {/* Client name */}
                    <td className="py-3 px-4 text-sm">
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
                    <td className="py-3 px-4 text-sm">
                      <span className={cn('badge', getStatusBadge(client.status))}>
                        {client.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 text-sm">
                      {client.priority ? (
                        <span className={cn('badge', getPriorityBadge(client.priority))}>
                          {client.priority}
                        </span>
                      ) : (
                        <span className="text-surface-500">—</span>
                      )}
                    </td>

                    {/* Teams */}
                    <td className="py-3 px-4 text-sm">
                      {client.teamAssignments && client.teamAssignments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {client.teamAssignments.slice(0, 2).map((teamAssignment) => {
                            const tag = teamAssignment.team.tag || teamAssignment.team.name
                            const color = teamAssignment.team.color || '#64748b'
                            return (
                              <span
                                key={teamAssignment.id}
                                className="px-2 py-0.5 text-xs rounded border"
                                style={{
                                  backgroundColor: `${color}20`,
                                  color: color,
                                  borderColor: `${color}30`,
                                }}
                              >
                                {tag}
                              </span>
                            )
                          })}
                          {client.teamAssignments.length > 2 && (
                            <span className="text-xs text-surface-500">
                              +{client.teamAssignments.length - 2}
                            </span>
                          )}
                        </div>
                      ) : client.teams && client.teams.length > 0 ? (
                        // Fallback to legacy teams array
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
                    <td className="py-3 px-4 text-sm">
                      <span className="text-surface-300">
                        {getCadenceLabel(client.defaultCadence)}
                      </span>
                    </td>

                    {/* Infra Check Assignee */}
                    <td className="py-3 px-4 text-sm">
                      {(() => {
                        // Priority: 1) infraCheckAssigneeName override, 2) SE from assignments table, 3) legacy systemEngineerName
                        // Filter out orphaned assignments where user is null
                        const validAssignments = client.assignments?.filter((a: any) => a.User !== null) || []
                        const seAssignments = validAssignments.filter(a => a.role === 'SE') || []
                        const seFromAssignments = seAssignments.length > 0 ? seAssignments[0].User?.name : null
                        const assignee = client.infraCheckAssigneeName || seFromAssignments || client.systemEngineerName
                        const isOverride = client.infraCheckAssigneeName && 
                          client.infraCheckAssigneeName !== seFromAssignments &&
                          client.infraCheckAssigneeName !== client.systemEngineerName
                        const seUserFromAssignments = seAssignments.length > 0 ? seAssignments[0].User : null
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
                    <td className="py-3 px-4 text-sm">
                      <ClientActionsMenu client={client} />
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 pt-4 pb-2 border-t border-surface-700/50 flex items-center justify-between">
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
