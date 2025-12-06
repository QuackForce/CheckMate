'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Calendar,
  MoreHorizontal,
  ExternalLink,
  Globe,
  Loader2,
  Filter,
} from 'lucide-react'
import { cn, getCadenceLabel } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'

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
  // Use Google's high-res favicon service
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

export function ClientsTableWrapper() {
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Fetch all clients once on mount
  useEffect(() => {
    const fetchAllClients = async () => {
      setLoading(true)
      try {
        // Fetch all clients (no pagination, no search filter)
        const res = await fetch('/api/clients?limit=1000')
        const data = await res.json()
        
        if (data.clients) {
          setAllClients(data.clients)
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllClients()
  }, [])

  // Client-side filtering (like team search)
  const filteredClients = allClients.filter(client => {
    if (!search.trim()) return true
    
    const query = search.toLowerCase()
    return (
      client.name?.toLowerCase().includes(query) ||
      client.pocEmail?.toLowerCase().includes(query) ||
      client.teams?.some(team => team.toLowerCase().includes(query)) ||
      client.status?.toLowerCase().includes(query) ||
      client.primaryEngineer?.name?.toLowerCase().includes(query) ||
      client.secondaryEngineer?.name?.toLowerCase().includes(query) ||
      client.systemEngineerName?.toLowerCase().includes(query) ||
      client.infraCheckAssigneeName?.toLowerCase().includes(query) ||
      getDomain(client.websiteUrl)?.toLowerCase().includes(query)
    )
  })

  // Sort filtered clients alphabetically
  const sortedClients = [...filteredClients].sort((a, b) => 
    a.name.localeCompare(b.name)
  )

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

  const handleSearch = (value: string) => {
    setSearch(value)
  }

  return (
    <div className="card overflow-hidden">
      {/* Search & Filters Bar */}
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, email, team, or engineer..."
            className="flex-1 min-w-[280px] max-w-md"
            isLoading={false}
          />
          
          {/* Quick filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-surface-500" />
            <select
              className="px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-sm text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              defaultValue="all"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Results count */}
          {!loading && (
            <span className="text-sm text-surface-500 ml-auto">
              {filteredClients.length} of {allClients.length} client{allClients.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
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
                {sortedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-surface-800/30 transition-colors"
                  >
                    {/* Client name */}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {getLogoUrl(client.websiteUrl) ? (
                          <img 
                            src={getLogoUrl(client.websiteUrl)!} 
                            alt=""
                            className="w-10 h-10 rounded-lg bg-white p-1.5 object-contain flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.outerHTML = '<div class="w-10 h-10 rounded-lg bg-surface-700/50 flex items-center justify-center flex-shrink-0"><svg class="w-5 h-5 text-surface-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg></div>'
                            }}
                          />
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
                        // Use override if set, otherwise default to SE
                        const assignee = client.infraCheckAssigneeName || client.systemEngineerName
                        const isOverride = client.infraCheckAssigneeName && client.infraCheckAssigneeName !== client.systemEngineerName
                        // Only use the looked-up user's image - don't fallback to primaryEngineer
                        // If no image, we'll show initials instead
                        const avatarImage = client.infraCheckAssigneeUser?.image || null
                        
                        if (assignee) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0">
                                {avatarImage ? (
                                  <img
                                    src={avatarImage}
                                    alt={assignee}
                                    className={cn(
                                      'w-7 h-7 rounded-full object-cover border',
                                      isOverride ? 'border-amber-500' : 'border-brand-500'
                                    )}
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
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}
    </div>
  )
}
