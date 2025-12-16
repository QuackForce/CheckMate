'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Loader2,
  Save,
  X,
  Users,
  Building2,
  User,
  Download,
  ChevronDown,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
import { SearchInput } from '@/components/ui/search-input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface TeamMember {
  id: string
  name: string | null
  email: string | null
  image: string | null
  jobTitle: string | null
}

interface TeamClient {
  id: string
  name: string
  status: string
  clientTeamId?: string
}

interface Team {
  id: string
  name: string
  description: string | null
  color: string | null
  tag: string | null
  managerId: string | null
  manager?: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    jobTitle: string | null
  } | null
  isActive: boolean
  members?: TeamMember[]
  clients?: TeamClient[]
  _count?: {
    clients: number
    users: number
  }
}

export default function TeamsSettingsPage() {
  const { data: session, status } = useSession()
  const sessionLoading = status === 'loading'
  
  // Allow ADMIN, IT_ENGINEER, and IT_MANAGER to access teams page
  const hasAccess = session?.user?.role === 'ADMIN' || 
                   session?.user?.role === 'IT_ENGINEER' || 
                   session?.user?.role === 'IT_MANAGER'
  
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [importing, setImporting] = useState(false)
  const [allUsers, setAllUsers] = useState<TeamMember[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [openComboboxes, setOpenComboboxes] = useState<Set<string>>(new Set())
  const [openSection, setOpenSection] = useState<string | null>(null) // Track which section is open
  const [teamToDeactivate, setTeamToDeactivate] = useState<Team | null>(null)
  
  // Helper functions for section state
  const showTeamInfo = openSection === 'info'
  const showTeamManager = openSection === 'manager'
  const showTeamMembers = openSection === 'members'
  const showClients = openSection === 'clients'
  
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '',
    tag: '',
    managerId: '',
  })

  useEffect(() => {
    if (hasAccess) {
      fetchTeams()
      fetchAllUsers()
    }
  }, [hasAccess])


  const fetchAllUsers = async () => {
    try {
      // Use limit=200 to get all users (pagination support)
      const res = await fetch('/api/users?limit=200')
      if (res.ok) {
        const data = await res.json()
        // Handle both paginated response (data.users) and array response (backward compatibility)
        const users = data.users || data || []
        setAllUsers(users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          jobTitle: null, // Not included in basic user list
        })))
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Team name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Team created')
        setShowNewModal(false)
        setFormData({ name: '', description: '', color: '', tag: '', managerId: '' })
        fetchTeams()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create team')
      }
    } catch (error) {
      toast.error('Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingTeam || !formData.name.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userIds: selectedUserIds, // Include selected user IDs
        }),
      })

      if (res.ok) {
        toast.success('Team updated')
        // Refresh the team data to get updated manager info
        const updatedRes = await fetch(`/api/teams/${editingTeam.id}`)
        if (updatedRes.ok) {
          const updatedTeam = await updatedRes.json()
          setEditingTeam(updatedTeam)
          // Update formData with the latest managerId
          setFormData(prev => ({
            ...prev,
            managerId: updatedTeam.managerId || '',
          }))
        }
        fetchTeams() // Refresh the teams list
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update team')
      }
    } catch (error) {
      toast.error('Failed to update team')
    } finally {
      setSaving(false)
    }
  }


  const handleToggleActiveClick = (team: Team) => {
    if (team.isActive) {
      // Show confirmation for deactivation
      setTeamToDeactivate(team)
    } else {
      // No confirmation needed for activation
      handleToggleActive(team)
    }
  }

  const handleToggleActive = async (team: Team) => {
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !team.isActive }),
      })

      if (res.ok) {
        toast.success(`Team ${!team.isActive ? 'activated' : 'deactivated'}`)
        fetchTeams()
        setTeamToDeactivate(null)
      }
    } catch (error) {
      toast.error('Failed to update team')
    }
  }

  const handleImportExisting = async () => {
    if (!confirm('This will import all teams from existing client and user data. Continue?')) return

    setImporting(true)
    try {
      const res = await fetch('/api/teams/import', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Teams imported successfully')
        fetchTeams()
      } else {
        toast.error(data.error || 'Failed to import teams')
      }
    } catch (error) {
      toast.error('Failed to import teams')
    } finally {
      setImporting(false)
    }
  }

  const openEditModal = async (team: Team) => {
    setFormData({
      name: team.name,
      description: team.description || '',
      color: team.color || '',
      tag: team.tag || '',
      managerId: team.managerId || '',
    })
    setOpenSection(null) // All sections closed by default when editing
    
    // Fetch full team data with members and clients
    try {
      const res = await fetch(`/api/teams/${team.id}`)
      if (res.ok) {
        const fullTeam = await res.json()
        setEditingTeam(fullTeam)
        setSelectedUserIds(fullTeam.members?.map((m: TeamMember) => m.id) || [])
      } else {
        // Fallback to basic team data
        setEditingTeam(team)
        setSelectedUserIds([])
      }
    } catch (error) {
      console.error('Failed to fetch team details:', error)
      setEditingTeam(team)
      setSelectedUserIds([])
    }
  }

  const handleRemoveClient = async (teamId: string, clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to remove "${clientName}" from this team?`)) return

    try {
      const res = await fetch(`/api/teams/${teamId}/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Client removed from team')
        // Refresh team data
        if (editingTeam) {
          const updatedRes = await fetch(`/api/teams/${teamId}`)
          if (updatedRes.ok) {
            const updatedTeam = await updatedRes.json()
            setEditingTeam(updatedTeam)
          }
        }
        fetchTeams() // Refresh the teams list
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to remove client from team')
      }
    } catch (error) {
      toast.error('Failed to remove client from team')
    }
  }

  // Filter teams based on search query
  const filteredTeams = searchQuery
    ? teams.filter((team) => {
        const query = searchQuery.toLowerCase()
        const matchesName = team.name.toLowerCase().includes(query)
        const matchesDescription = team.description?.toLowerCase().includes(query) || false
        return matchesName || matchesDescription
      })
    : teams
  
  // Separate active and inactive teams
  const activeTeams = filteredTeams.filter(team => team.isActive)
  const inactiveTeams = filteredTeams.filter(team => !team.isActive)

  // Color presets for quick selection
  const colorPresets = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#84CC16', label: 'Lime' },
  ]

  // Don't show access denied while session is still loading
  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-800 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="card p-12 text-center">
        <Users className="w-12 h-12 text-surface-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Access Denied</h3>
        <p className="text-surface-400">
          You need admin, IT engineer, or IT manager permissions to manage teams.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-800 rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white">Teams</h2>
          <p className="text-sm text-surface-400 mt-1">
            {filteredTeams.length} {searchQuery ? 'matching' : ''} team{filteredTeams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search teams..."
            className="w-64"
          />
          {teams.length === 0 && (
            <button
              onClick={handleImportExisting}
              disabled={importing}
              className="btn-ghost flex items-center gap-2"
            >
              <Download className={cn("w-4 h-4", importing && "animate-spin")} />
              {importing ? 'Importing...' : 'Import Existing Teams'}
            </button>
          )}
          <button
            onClick={() => {
              setFormData({ name: '', description: '', color: '', tag: '', managerId: '' })
              setOpenSection('info') // Open Team Information for new teams
              setShowNewModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Team
          </button>
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length > 0 ? (
        <>
          {/* Active Teams */}
          {activeTeams.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTeams.map(team => (
            <div
              key={team.id}
              className={cn(
                "p-4 rounded-xl backdrop-blur-sm transition-colors",
                team.isActive 
                  ? "bg-surface-800/50" 
                  : "bg-surface-900/50 opacity-60"
              )}
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: team.color && team.isActive 
                  ? team.color 
                  : team.isActive 
                    ? 'rgb(51, 65, 85)' // surface-700
                    : 'rgb(30, 41, 59)' // surface-800
              }}
            >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white truncate">{team.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-surface-500" />
                      <span className="text-xs text-surface-500 truncate">
                        {team.manager?.name || 'No manager'}
                      </span>
                    </div>
                  </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => openEditModal(team)}
                        className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 text-surface-400" />
                      </button>
                    </div>
                  </div>

                  {team.description && (
                    <p className="text-xs text-surface-400 mb-3 line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-surface-500">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{team._count?.clients || 0} clients</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{team._count?.users || 0} users</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActiveClick(team)}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        team.isActive 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-surface-700 text-surface-400"
                      )}
                    >
                      {team.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inactive Teams */}
          {inactiveTeams.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-surface-400 mb-3">Inactive Teams</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveTeams.map(team => (
            <div
              key={team.id}
              className={cn(
                "p-4 rounded-xl backdrop-blur-sm transition-colors",
                team.isActive 
                  ? "bg-surface-800/50" 
                  : "bg-surface-900/50 opacity-60"
              )}
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: team.color && team.isActive 
                  ? team.color 
                  : team.isActive 
                    ? 'rgb(51, 65, 85)' // surface-700
                    : 'rgb(30, 41, 59)' // surface-800
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white truncate">{team.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-surface-500" />
                      <span className="text-xs text-surface-500 truncate">
                        {team.manager?.name || 'No manager'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => openEditModal(team)}
                    className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-surface-400" />
                  </button>
                </div>
              </div>

              {team.description && (
                <p className="text-xs text-surface-400 mb-3 line-clamp-2">
                  {team.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-surface-500">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{team._count?.clients || 0} clients</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{team._count?.users || 0} users</span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActiveClick(team)}
                  className={cn(
                    "text-xs px-2 py-1 rounded",
                    team.isActive 
                      ? "bg-green-500/20 text-green-400" 
                      : "bg-surface-700 text-surface-400"
                  )}
                >
                  {team.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No teams yet</h3>
          <p className="text-surface-400 mb-4">
            Create teams to organize clients and users.
          </p>
          <button
            onClick={() => {
              setFormData({ name: '', description: '', color: '', tag: '', managerId: '' })
              setShowNewModal(true)
            }}
            className="btn-primary"
          >
            Create First Team
          </button>
        </div>
      )}

      {/* New/Edit Sheet */}
      <Sheet open={showNewModal || !!editingTeam} onOpenChange={(open) => {
        if (!open) {
          setShowNewModal(false)
          setEditingTeam(null)
          setSelectedUserIds([])
          setOpenSection(null) // Reset sections
        }
      }}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTeam ? 'Edit Team' : 'New Team'}
            </SheetTitle>
            <SheetDescription>
              {editingTeam 
                ? 'Update team details and manage team members.'
                : 'Create a new team to organize clients and users.'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Team Info Section - Collapsible when editing */}
            <div>
              <button
                onClick={() => toggleSection('info')}
                className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors"
              >
                <label className="block text-sm font-medium text-surface-300 cursor-pointer flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Team Information
                </label>
                <ChevronDown className={cn(
                  'w-4 h-4 text-surface-400 transition-transform',
                  showTeamInfo && 'rotate-180'
                )} />
              </button>
              {showTeamInfo && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., Consultant Team 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="input w-full"
                      rows={3}
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">
                      Team Tag
                    </label>
                    <p className="text-xs text-surface-500 mb-2">
                      This tag will appear on clients associated with this team (e.g., "Team 1", "Consultant Team 1")
                    </p>
                    <input
                      type="text"
                      value={formData.tag}
                      onChange={e => setFormData({ ...formData, tag: e.target.value })}
                      className="input w-full"
                      placeholder="e.g., Team 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-1">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colorPresets.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: preset.value })}
                          className={cn(
                            "w-8 h-8 rounded border-2 transition-all",
                            formData.color === preset.value 
                              ? "border-white scale-110" 
                              : "border-surface-600 hover:border-surface-500"
                          )}
                          style={{ backgroundColor: preset.value }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Team Manager - Only show when editing existing team */}
            {editingTeam && (
              <div className={cn("mt-6 pt-6 border-t border-surface-700", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
                <button
                  type="button"
                  onClick={() => toggleSection('manager')}
                  className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors mb-3"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                    <User className="w-4 h-4" />
                    Team Manager
                    {formData.managerId && (
                      <span className="text-xs text-surface-500 font-normal">
                        (1)
                      </span>
                    )}
                  </label>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    showTeamManager && 'rotate-180'
                  )} />
                </button>
                {showTeamManager && (
                  <div className="space-y-4">
                    <div className={cn("space-y-2", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
                      <label className="block text-sm font-medium text-surface-300 mb-1">
                        Manager
                      </label>
                      <p className="text-xs text-surface-500 mb-2">
                        Select a manager for this team (optional)
                      </p>
                      <Combobox
                        value={formData.managerId}
                        onChange={(val) => setFormData({ ...formData, managerId: val || '' })}
                        options={[
                          { value: '', label: 'No Manager' },
                          ...allUsers.map(user => ({
                            value: user.id,
                            label: user.name || user.email || 'Unknown',
                          })),
                        ]}
                        placeholder="Select a manager..."
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenComboboxes(prev => new Set(prev).add('manager'))
                          } else {
                            setOpenComboboxes(prev => {
                              const next = new Set(prev)
                              next.delete('manager')
                              return next
                            })
                          }
                        }}
                        showChevron={true}
                      />
                      {formData.managerId && (
                        <div className="text-xs text-surface-500 mt-1">
                          Selected: {allUsers.find(u => u.id === formData.managerId)?.name || 'Unknown'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Team Members - Only show when editing existing team */}
            {editingTeam && (
              <div className={cn("mt-6 pt-6 border-t border-surface-700", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
                <button
                  onClick={() => toggleSection('members')}
                  className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors mb-3"
                >
                  <label className="block text-sm font-medium text-surface-300 flex items-center gap-2 cursor-pointer">
                    <Users className="w-4 h-4" />
                    Team Members
                    {editingTeam.members && editingTeam.members.length > 0 && (
                      <span className="text-xs text-surface-500 font-normal">
                        ({editingTeam.members.length})
                      </span>
                    )}
                  </label>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    showTeamMembers && 'rotate-180'
                  )} />
                </button>
                {showTeamMembers && (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {/* Add Member Card */}
                  <div className="flex items-center gap-2 p-2 bg-surface-800/50 border-2 border-dashed border-surface-600 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Combobox
                        value=""
                        onChange={(val) => {
                          if (val && !selectedUserIds.includes(val)) {
                            const addedUser = allUsers.find(u => u.id === val)
                            setSelectedUserIds([val, ...selectedUserIds])
                            toast.success('Team member added', {
                              description: addedUser ? `${addedUser.name || 'User'} has been added to the team` : 'Team member added successfully'
                            })
                          }
                        }}
                        options={allUsers
                          .filter(u => !selectedUserIds.includes(u.id))
                          .map(u => ({
                            value: u.id,
                            label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                          }))}
                        placeholder="Add team member..."
                        allowClear={false}
                        showChevron={false}
                        onOpenChange={(isOpen) => {
                          setOpenComboboxes(prev => {
                            const next = new Set(prev)
                            if (isOpen) next.add('members')
                            else next.delete('members')
                            return next
                          })
                        }}
                      />
                    </div>
                  </div>
                    {selectedUserIds.map((userId) => {
                      const user = allUsers.find(u => u.id === userId)
                      return user ? (
                        <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                          {user.image ? (
                            <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white">
                              {user.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white">{user.name || 'Unknown'}</div>
                            {user.email && (
                              <div className="text-xs text-surface-400 truncate">{user.email}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedUserIds(selectedUserIds.filter(id => id !== userId))}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null
                    })}
                  </div>
                )}
              </div>
              )}

              {/* Clients Section - Only show when editing existing team */}
              {editingTeam && (
                <div className="mt-6 pt-6 border-t border-surface-700">
                  <button
                    onClick={() => toggleSection('clients')}
                    className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors mb-3"
                  >
                    <label className="block text-sm font-medium text-surface-300 flex items-center gap-2 cursor-pointer">
                      <Building2 className="w-4 h-4" />
                      Associated Clients
                      {editingTeam.clients && editingTeam.clients.length > 0 && (
                        <span className="text-xs text-surface-500 font-normal">
                          ({editingTeam.clients.length})
                        </span>
                      )}
                    </label>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-surface-400 transition-transform',
                      showClients && 'rotate-180'
                    )} />
                  </button>
                  {showClients && (
                    <>
                      {editingTeam.clients && editingTeam.clients.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {editingTeam.clients.map((client) => (
                            <div key={client.id} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                              <Building2 className="w-4 h-4 text-surface-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white">{client.name}</div>
                                <div className="text-xs text-surface-400">
                                  {client.status}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveClient(editingTeam.id, client.id, client.name)}
                                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                title="Remove client from team"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-surface-500 p-4 text-center bg-surface-800/50 rounded-lg border border-dashed border-surface-700">
                          No clients associated with this team. Add clients from the client edit page.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
          </div>

          <SheetFooter className="mt-8">
            <button
              onClick={() => {
                setShowNewModal(false)
                setEditingTeam(null)
                setSelectedUserIds([])
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={editingTeam ? handleUpdate : handleCreate}
              disabled={saving || !formData.name.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingTeam ? 'Update' : 'Create'}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Deactivate Confirmation Dialog */}
      {teamToDeactivate && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setTeamToDeactivate(null)}
        >
          <div 
            className="card w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  Deactivate Team
                </h3>
                <p className="text-sm text-surface-400 mt-1">
                  This will move the team to inactive
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-surface-800 rounded-lg">
              <p className="text-sm text-surface-300">
                Are you sure you want to deactivate{' '}
                <span className="font-semibold text-white">
                  "{teamToDeactivate.name}"
                </span>?
              </p>
              <p className="text-xs text-surface-500 mt-2">
                The team will be moved to the inactive section but can be reactivated at any time.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setTeamToDeactivate(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleActive(teamToDeactivate)}
                className="btn-primary flex-1 bg-amber-500 hover:bg-amber-600"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

