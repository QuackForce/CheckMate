'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Building2, ClipboardCheck, Users, Settings, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { UserProfileModal } from './user-profile-modal'

interface SearchResult {
  id: string
  name: string
  type: 'client' | 'check' | 'team' | 'system' | 'framework'
  url: string
  clientName?: string
  status?: string
  email?: string
  category?: string
  image?: string | null
  jobTitle?: string | null
  team?: string | null
  manager?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface SearchResults {
  clients: SearchResult[]
  checks: SearchResult[]
  team: SearchResult[]
  systems: SearchResult[]
  frameworks: SearchResult[]
}

const typeIcons = {
  client: Building2,
  check: ClipboardCheck,
  team: Users,
  system: Settings,
  framework: FileText,
}

const typeLabels = {
  client: 'Client',
  check: 'Check',
  team: 'Team Member',
  system: 'System',
  framework: 'Framework',
}

export function GlobalSearch() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({
    clients: [],
    checks: [],
    team: [],
    systems: [],
    frameworks: [],
  })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Flatten all results for keyboard navigation
  const allResults = [
    ...results.clients,
    ...results.checks,
    ...results.team,
    ...results.systems,
    ...results.frameworks,
  ]

  // Handle Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
        setSelectedIndex(0)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Prevent body scroll when search modal is open
  useScrollLock(isOpen || !!selectedUser)

  // Search API call
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({
        clients: [],
        checks: [],
        team: [],
        systems: [],
        frameworks: [],
      })
      setLoading(false)
      return
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Search failed' }))
          console.error('Search API error:', res.status, errorData)
          setError(errorData.error || `Search failed (${res.status})`)
          setResults({
            clients: [],
            checks: [],
            team: [],
            systems: [],
            frameworks: [],
          })
          return
        }
        const data = await res.json()
        console.log('Search results:', data) // Debug log
        // Ensure data has all required fields
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format')
        }
        setResults({
          clients: Array.isArray(data.clients) ? data.clients : [],
          checks: Array.isArray(data.checks) ? data.checks : [],
          team: Array.isArray(data.team) ? data.team : [],
          systems: Array.isArray(data.systems) ? data.systems : [],
          frameworks: Array.isArray(data.frameworks) ? data.frameworks : [],
        })
        setSelectedIndex(0)
      } catch (error: any) {
        console.error('Search error:', error)
        setError(error.message || 'An error occurred while searching')
        setResults({
          clients: [],
          checks: [],
          team: [],
          systems: [],
          frameworks: [],
        })
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(searchTimeout)
  }, [query])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault()
      handleSelectResult(allResults[selectedIndex])
    }
  }, [allResults, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-result-index="${selectedIndex}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  const handleSelectResult = (result: SearchResult) => {
    // For team members, show profile modal instead of navigating
    if (result.type === 'team') {
      setSelectedUser(result)
      setIsOpen(false) // Close search modal
      setQuery('')
      setSelectedIndex(0)
    } else {
      setIsOpen(false)
      setQuery('')
      setSelectedIndex(0)
      router.push(result.url)
    }
  }

  const hasResults = allResults.length > 0
  const hasQuery = query.length >= 2

  // Don't render anything if both modals are closed
  if (!isOpen && !selectedUser) return null

  return (
    <>
      {/* Search Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false)
              setQuery('')
            }
          }}
        >
      <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-surface-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, checks, team, systems..."
              className="w-full pl-10 pr-10 py-3 bg-surface-900 border border-surface-600 rounded-lg text-white placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-surface-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-surface-500" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[60vh] overflow-y-auto"
        >
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
            </div>
          ) : !hasQuery ? (
            <div className="p-8 text-center text-surface-400">
              <p>Type at least 2 characters to search</p>
              <p className="text-sm mt-2 text-surface-500">
                Press <kbd className="px-2 py-1 bg-surface-700 rounded text-xs">Esc</kbd> to close
              </p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-surface-400">
              <p className="text-red-400 mb-2">Error: {error}</p>
              <p className="text-sm text-surface-500">Please try again or check the console for details.</p>
            </div>
          ) : !hasResults ? (
            <div className="p-8 text-center text-surface-400">
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Group results by type */}
              {(() => {
                // Calculate cumulative indices for proper keyboard navigation
                let currentIndex = 0
                const groups = [
                  { key: 'clients', results: results.clients, label: 'Clients' },
                  { key: 'checks', results: results.checks, label: 'Checks' },
                  { key: 'team', results: results.team, label: 'Team' },
                  { key: 'systems', results: results.systems, label: 'Systems' },
                  { key: 'frameworks', results: results.frameworks, label: 'Frameworks' },
                ].filter(group => group.results.length > 0)

                return groups.map((group) => {
                  const groupStartIndex = currentIndex
                  currentIndex += group.results.length

                  return (
                    <div key={group.key} className="mb-4">
                      <div className="px-3 py-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                        {group.label}
                      </div>
                      {group.results.map((result, idx) => {
                        const resultIndex = groupStartIndex + idx
                        const isSelected = selectedIndex === resultIndex
                        const Icon = typeIcons[result.type]

                        return (
                          <button
                            key={result.id}
                            data-result-index={resultIndex}
                            onClick={() => handleSelectResult(result)}
                            onMouseEnter={() => setSelectedIndex(resultIndex)}
                            className={cn(
                              'w-full px-3 py-2.5 rounded-lg text-left transition-colors flex items-center gap-3',
                              isSelected
                                ? 'bg-brand-500/20 text-white'
                                : 'hover:bg-surface-700/50 text-surface-300'
                            )}
                          >
                            <Icon className="w-4 h-4 text-surface-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{result.name}</div>
                              {result.clientName && (
                                <div className="text-xs text-surface-500 truncate">
                                  {result.clientName}
                                </div>
                              )}
                              {result.email && (
                                <div className="text-xs text-surface-500 truncate">
                                  {result.email}
                                </div>
                              )}
                              {result.category && (
                                <div className="text-xs text-surface-500 truncate">
                                  {result.category}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-surface-500 flex-shrink-0">
                              {typeLabels[result.type]}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasResults && (
          <div className="p-3 border-t border-surface-700 flex items-center justify-between text-xs text-surface-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-700 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-surface-700 rounded">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-700 rounded">Enter</kbd>
                Select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-surface-700 rounded">Esc</kbd>
              Close
            </span>
          </div>
        )}
      </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && selectedUser.type === 'team' && (
        <UserProfileModal
          user={{
            id: selectedUser.id,
            name: selectedUser.name,
            email: selectedUser.email || null,
            image: selectedUser.image || null,
            jobTitle: selectedUser.jobTitle || null,
            team: selectedUser.team || null,
            manager: selectedUser.manager || null,
          }}
          isOpen={!!selectedUser}
          onClose={() => {
            setSelectedUser(null)
            // Reopen search if it was open before
            if (query) {
              setIsOpen(true)
            }
          }}
        />
      )}
    </>
  )
}
