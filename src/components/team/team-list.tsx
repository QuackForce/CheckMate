'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
  Shield,
  Star,
  Wrench,
  Eye,
  Check,
  X,
  Link2,
  Pencil,
  Trash2,
  Merge,
  Unlink,
  Search,
  Users,
  Save,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'

interface TeamMember {
  id: string
  name: string
  email: string | null
  role: 'ADMIN' | 'IT_ENGINEER' | 'VIEWER' | 'IT_MANAGER' | 'CONSULTANT'
  image: string | null
  jobTitle?: string | null
  team?: string | null
  managerId?: string | null
  manager?: { id: string; name: string | null; email: string | null; jobTitle: string | null } | null
  notionTeamMemberId: string | null
  notionTeamMemberName: string | null
  slackUsername: string | null
  hasHarvest?: boolean
  lastLoginAt?: Date | null
  loginCount?: number
  stats: {
    assignedClients: number
    completedThisMonth: number
    overdueChecks: number
    avgDuration: number
  }
}

interface TeamListProps {
  team: TeamMember[]
  isAdmin: boolean
  currentUserId?: string
}

const roleConfig = {
  ADMIN: {
    label: 'Admin',
    icon: Shield,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20 border-purple-500/30',
  },
  IT_MANAGER: {
    label: 'IT Manager',
    icon: Users,
    color: 'text-amber-300',
    bg: 'bg-amber-500/20 border-amber-500/30',
  },
  IT_ENGINEER: {
    label: 'IT Engineer',
    icon: Wrench,
    color: 'text-brand-400',
    bg: 'bg-brand-500/20 border-brand-500/30',
  },
  CONSULTANT: {
    label: 'Consultant',
    icon: Users,
    color: 'text-surface-300',
    bg: 'bg-surface-700/50 border-surface-600',
  },
  VIEWER: {
    label: 'Viewer',
    icon: Eye,
    color: 'text-surface-400',
    bg: 'bg-surface-700/50 border-surface-600',
  },
}

export function TeamList({ team, isAdmin, currentUserId }: TeamListProps) {
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
  const [mergeTarget, setMergeTarget] = useState<string>('')
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [slackUsername, setSlackUsername] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false)

  // For portal - need to wait for client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update slackUsername when editingUser changes
  useEffect(() => {
    if (editingUser) {
      setSlackUsername(editingUser.slackUsername || '')
      setSelectedManagerId(editingUser.managerId || null)
    }
  }, [editingUser])

  const handleUpdateSlackUsername = async () => {
    if (!editingUser) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          slackUsername: slackUsername.trim() || null 
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Slack username updated')
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to update Slack username', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Filter by search query and role
  const filteredTeam = team.filter(member => {
    // Role filter
    if (roleFilter !== 'all' && member.role !== roleFilter) return false
    
    // Search filter
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      member.name?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.slackUsername?.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query) ||
      (member.jobTitle || '').toLowerCase().includes(query) ||
      (member.team || '').toLowerCase().includes(query)
    )
  })

  // Sort by completed checks (descending)
  const sortedTeam = [...filteredTeam].sort(
    (a, b) => b.stats.completedThisMonth - a.stats.completedThisMonth
  )

  const topPerformer = sortedTeam.find(m => m.stats.completedThisMonth > 0)

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Role updated successfully')
      setEditingRole(null)
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to update role', { description: err.message })
    }
  }

  const handleUpdateManager = async (userId: string, managerId: string | null) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Manager updated')
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to update manager', { description: err.message })
    }
  }

  const handleSaveAll = async () => {
    if (!editingUser) return
    setSaving(true)
    try {
      // Save manager and slack username together
      const updates: any = {}
      if (selectedManagerId !== (editingUser.managerId || null)) {
        updates.managerId = selectedManagerId
      }
      if (slackUsername !== (editingUser.slackUsername || '')) {
        updates.slackUsername = slackUsername.trim() || null
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save')
        setSaving(false)
        return
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Changes saved')
      setEditingUser(null)
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to save changes', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('User deleted')
      setShowDeleteConfirm(null)
      setEditingUser(null)
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to delete user', { description: err.message })
      setShowDeleteConfirm(null)
    }
  }

  const handleMergeUsers = async () => {
    if (!editingUser || !mergeTarget) return
    
    const targetUser = team.find(t => t.id === mergeTarget)
    
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${mergeTarget}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUserId: editingUser.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Users merged successfully')
      setEditingUser(null)
      setMergeTarget('')
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to merge users', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleUnlinkNotion = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notionTeamMemberId: null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      toast.success('Unlinked from Notion')
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to unlink', { description: err.message })
    }
  }

  const handleAvatarUpload = async (userId: string, file: File | null) => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)

    try {
      toast.info('Uploading avatar...')
      const res = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload avatar')
      }
      toast.success('Avatar updated!')
      setEditingUser(null)
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to upload avatar', { description: err.message })
    }
  }

  if (team.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
          <Shield className="w-8 h-8 text-surface-600" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No team members yet</h3>
        <p className="text-surface-400 mb-4">
          Team members will appear here once they sign in with Google
        </p>
        {isAdmin && (
          <p className="text-sm text-surface-500">
            Click "Sync from Notion" above to import team members from your Notion database
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn("card", isRoleFilterOpen && "relative z-50")}>
      <div className="p-4 border-b border-surface-700/50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Team Members</h2>
          <span className="text-sm text-surface-500">{filteredTeam.length} of {team.length} members</span>
        </div>
        
        {/* Search and Role Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by name, email, or Slack username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <Combobox
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'ADMIN', label: 'Admins' },
              { value: 'IT_MANAGER', label: 'IT Managers' },
              { value: 'IT_ENGINEER', label: 'IT Engineers' },
              { value: 'CONSULTANT', label: 'Consultants' },
              { value: 'VIEWER', label: 'Viewers' },
            ]}
            placeholder="Filter by role..."
            searchable={false}
            className="w-[130px]"
            onOpenChange={setIsRoleFilterOpen}
          />
        </div>
      </div>

      <div className="divide-y divide-surface-700/50">
        {sortedTeam.map((member, index) => {
          const isTop = member.id === topPerformer?.id && member.stats.completedThisMonth > 0
          const isCurrentUser = member.id === currentUserId
          const role = roleConfig[member.role] || {
            label: member.role || 'Unknown',
            icon: Users,
            color: 'text-surface-400',
            bg: 'bg-surface-700',
          }
          const RoleIcon = role.icon
          const isEditingThis = editingRole === member.id

          return (
            <div
              key={member.id}
              className="p-4 hover:bg-surface-800/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-lg font-semibold text-white">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  {isTop && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-semibold text-white">{member.name}</span>
                    
                    {/* Role Badge - Clickable for admins */}
                    {isEditingThis ? (
                      <div className="flex items-center gap-1">
                        <div className="flex-1 min-w-[120px]">
                          <Combobox
                            value={selectedRole}
                            onChange={setSelectedRole}
                            options={[
                              { value: 'ADMIN', label: 'Admin' },
                              { value: 'IT_MANAGER', label: 'IT Manager' },
                              { value: 'IT_ENGINEER', label: 'IT Engineer' },
                              { value: 'CONSULTANT', label: 'Consultant' },
                              { value: 'VIEWER', label: 'Viewer' },
                            ]}
                            placeholder="Select role..."
                            className="text-xs"
                            searchable={false}
                          />
                        </div>
                        <button
                          onClick={() => handleRoleChange(member.id, selectedRole)}
                          className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingRole(null)}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isAdmin && !isCurrentUser) {
                            setEditingRole(member.id)
                            setSelectedRole(member.role)
                          }
                        }}
                        disabled={!isAdmin || isCurrentUser}
                        className={cn(
                          'badge text-xs flex items-center gap-1 border transition-all',
                          role.bg,
                          role.color,
                          isAdmin && !isCurrentUser && 'hover:opacity-80 cursor-pointer',
                          (!isAdmin || isCurrentUser) && 'cursor-default'
                        )}
                        title={isAdmin && !isCurrentUser ? 'Click to change role' : isCurrentUser ? "Can't change your own role" : 'Admin only'}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {role.label}
                      </button>
                    )}
                    
                    {isTop && (
                      <span className="badge bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        Top Performer
                      </span>
                    )}
                    
                    {isCurrentUser && (
                      <span className="badge bg-brand-500/20 text-brand-400 border-brand-500/30 text-xs">
                        You
                      </span>
                    )}
                    
                    {member.notionTeamMemberId && (
                      <span className="text-green-400" title={`Linked to Notion: ${member.notionTeamMemberName || 'Unknown'}`}>
                        <Link2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  {member.jobTitle && (
                    <p className="text-xs text-surface-400 mt-0.5 truncate">{member.jobTitle}</p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-surface-400">
                    <Mail className="w-3.5 h-3.5" />
                    {member.email}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-surface-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      {member.lastLoginAt 
                        ? `Last active: ${formatDate(member.lastLoginAt)}`
                        : 'Never logged in'}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-surface-300">
                      <Building2 className="w-4 h-4 text-surface-500" />
                      <span className="font-semibold">{member.stats.assignedClients}</span>
                    </div>
                    <span className="text-xs text-surface-500">Clients</span>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center gap-1 text-brand-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-semibold">{member.stats.completedThisMonth}</span>
                    </div>
                    <span className="text-xs text-surface-500">This Month</span>
                  </div>

                  <div className="text-center">
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        member.stats.overdueChecks > 0
                          ? 'text-red-400'
                          : 'text-surface-400'
                      )}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-semibold">{member.stats.overdueChecks}</span>
                    </div>
                    <span className="text-xs text-surface-500">Overdue</span>
                  </div>

                  {member.stats.avgDuration > 0 && (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-surface-300">
                        <Clock className="w-4 h-4 text-surface-500" />
                        <span className="font-semibold">
                          {Math.round(member.stats.avgDuration / 60)}m
                        </span>
                      </div>
                      <span className="text-xs text-surface-500">Avg Time</span>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingUser(member)}
                      className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                      title="Edit / Merge User"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!isCurrentUser ? (
                      <button
                        onClick={() => setShowDeleteConfirm(member.id)}
                        className="p-2 text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      // Placeholder to maintain consistent spacing - matches button structure exactly
                      <div className="p-2">
                        <div className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Edit/Merge Modal - Using Portal for proper positioning */}
      {mounted && editingUser && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingUser(null)
              setMergeTarget('')
            }
          }}
        >
          <div 
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <label className="relative cursor-pointer group">
                  {editingUser.image ? (
                    <img src={editingUser.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold">
                      {editingUser.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-opacity">
                    Change
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarUpload(editingUser.id, e.target.files?.[0] || null)}
                  />
                </label>
                <div>
                  <h3 className="text-lg font-semibold text-white">{editingUser.name || 'No name'}</h3>
                  <p className="text-sm text-surface-400">{editingUser.email || 'No email'}</p>
                </div>
                {editingUser.notionTeamMemberId && (
                  <span className="badge bg-green-500/20 text-green-400 border-green-500/30 text-xs flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Notion Linked
                  </span>
                )}
              </div>
              <button
                onClick={() => { setEditingUser(null); setMergeTarget('') }}
                className="p-1 text-surface-400 hover:text-white rounded hover:bg-surface-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Manager Selection */}
                <div className="flex flex-col">
                  <label className="label flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    Manager
                  </label>
                  <Combobox
                    value={selectedManagerId || ''}
                    onChange={(val) => setSelectedManagerId(val || null)}
                    options={[
                      { value: '', label: 'No manager' },
                      ...team
                        .filter((t) => t.id !== editingUser.id)
                        .map((t) => ({
                          value: t.id,
                          label: `${t.name}${t.jobTitle ? ` • ${t.jobTitle}` : ''}`,
                        })),
                    ]}
                    allowClear
                    className="w-full"
                  />
                </div>

                {/* Slack Username */}
                <div className="flex flex-col">
                  <label className="label flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4" />
                    Slack Username
                  </label>
                  <input
                    type="text"
                    value={slackUsername}
                    onChange={(e) => setSlackUsername(e.target.value)}
                    placeholder="john.doe (without @)"
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Merge Section - Only show if user has Notion link */}
              {editingUser.notionTeamMemberId && (
                <div className="space-y-2 pt-4 border-t border-surface-700">
                  <label className="label flex items-center gap-2">
                    <Merge className="w-4 h-4" />
                    Merge into another user
                  </label>
                  <p className="text-xs text-surface-500 mb-2">
                    This will delete "{editingUser.name}" and transfer their Notion link to the selected user.
                  </p>
                  <Combobox
                    value={mergeTarget}
                    onChange={setMergeTarget}
                    options={team
                      .filter(t => t.id !== editingUser.id && !t.notionTeamMemberId)
                      .map(t => ({
                        value: t.id,
                        label: `${t.name} ${t.email ? `(${t.email})` : '(no email)'}`,
                      }))}
                    placeholder="Select user to merge into..."
                    allowClear
                  />
                  {mergeTarget && (
                    <button
                      onClick={handleMergeUsers}
                      disabled={saving}
                      className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                    >
                      <Merge className="w-4 h-4" />
                      {saving ? 'Merging...' : 'Merge Users'}
                    </button>
                  )}
                </div>
              )}

              {/* Save Button */}
              <div className="pt-4 border-t border-surface-700">
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-surface-700">
              <h4 className="text-sm font-medium text-surface-400 mb-3">Quick Actions</h4>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative group">
                  <button
                    onClick={() => {
                      window.location.href = '/api/harvest/auth'
                    }}
                    className="p-2 rounded-lg hover:bg-surface-800 transition-colors text-surface-300"
                  >
                    <Clock className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 border border-surface-700 rounded text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {editingUser.hasHarvest ? 'Reconnect Harvest' : 'Connect Harvest'}
                  </div>
                </div>

                {editingUser.notionTeamMemberId && (
                  <>
                    <div className="relative group">
                      <button
                        onClick={async () => {
                          try {
                            toast.info('Attaching clients from Notion…')
                            const res = await fetch(`/api/users/${editingUser.id}/clients`, {
                              method: 'POST',
                            })
                            const data = await res.json()
                            if (!res.ok) {
                              throw new Error(data.error || 'Failed to attach clients')
                            }
                            toast.success('Clients attached', {
                              description: `Primary: ${data.primaryAttached}, Secondary: ${data.secondaryAttached}`,
                            })
                            setEditingUser(null)
                            window.location.reload()
                          } catch (err: any) {
                            toast.error('Failed to attach clients', { description: err.message })
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-surface-800 transition-colors text-green-400"
                      >
                        <Merge className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 border border-surface-700 rounded text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        Attach clients from Notion
                      </div>
                    </div>
                    <div className="relative group">
                      <button
                        onClick={() => { handleUnlinkNotion(editingUser.id); setEditingUser(null) }}
                        className="p-2 rounded-lg hover:bg-surface-800 transition-colors text-amber-400"
                      >
                        <Unlink className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 border border-surface-700 rounded text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        Unlink from Notion
                      </div>
                    </div>
                  </>
                )}
                <div className="relative group">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(editingUser.id)
                      setEditingUser(null)
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 border border-surface-700 rounded text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    Delete User
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog */}
      {mounted && showDeleteConfirm && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div 
            className="card w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Delete User</h3>
                <p className="text-sm text-surface-400 mt-1">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-surface-800 rounded-lg">
              <p className="text-sm text-surface-300">
                Are you sure you want to delete <span className="font-semibold text-white">
                  {team.find(u => u.id === showDeleteConfirm)?.name || 'this user'}
                </span>?
              </p>
              <p className="text-xs text-surface-500 mt-2">
                This will permanently remove the user and all associated data.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const user = team.find(u => u.id === showDeleteConfirm)
                  if (user) {
                    handleDeleteUser(user.id, user.name || 'this user')
                  }
                }}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600 border-red-500"
              >
                <Trash2 className="w-4 h-4" />
                Delete User
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
