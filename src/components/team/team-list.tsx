'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  Pencil,
  Trash2,
  Search,
  Users,
  Save,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  User,
  Briefcase,
  Info,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
import { getRoleConfig, getRoleBadgeClasses, getRoleAbbreviation } from '@/lib/role-config'

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
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [slackUsername, setSlackUsername] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [userJobTitle, setUserJobTitle] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const usersPerPage = 30
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false)
  const [roleBreakdown, setRoleBreakdown] = useState<Record<string, number> | null>(null)
  const [totalUniqueClients, setTotalUniqueClients] = useState<number | null>(null)
  const [loadingRoleBreakdown, setLoadingRoleBreakdown] = useState(false)
  const [openComboboxes, setOpenComboboxes] = useState<Set<string>>(new Set())
  const [openSection, setOpenSection] = useState<string | null>(null) // Track which section is open (accordion)
  const [showNewUserSheet, setShowNewUserSheet] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [showClientAssignments, setShowClientAssignments] = useState<string | null>(null) // User ID whose clients to show
  const [clientAssignments, setClientAssignments] = useState<Array<{ clientId: string; clientName: string; clientStatus: string; roles: string[] }>>([])
  const [loadingClientAssignments, setLoadingClientAssignments] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    name: '',
    role: 'VIEWER',
  })
  
  // Helper functions for section state
  const showBasicInfo = openSection === 'basicInfo'
  const showRoleBreakdown = openSection === 'roleBreakdown'
  const showQuickActions = openSection === 'quickActions'
  
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }
  
  const handleCreateUser = async () => {
    if (!newUserForm.email.trim()) {
      toast.error('Email is required')
      return
    }

    setCreatingUser(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserForm.email.trim(),
          name: newUserForm.name.trim() || null,
          role: newUserForm.role,
        }),
      })

      if (res.ok) {
        toast.success('User created successfully')
        setShowNewUserSheet(false)
        setNewUserForm({ email: '', name: '', role: 'VIEWER' })
        window.location.reload()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create user')
      }
    } catch (error) {
      toast.error('Failed to create user')
    } finally {
      setCreatingUser(false)
    }
  }

  // For portal - need to wait for client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update form fields when editingUser changes
  useEffect(() => {
    if (editingUser) {
      setSlackUsername(editingUser.slackUsername || '')
      setSelectedManagerId(editingUser.managerId || null)
      setUserName(editingUser.name || '')
      setUserEmail(editingUser.email || '')
      setUserJobTitle(editingUser.jobTitle || '')
      setOpenSection(null) // All sections closed by default when editing
      // Fetch role breakdown and teams
      setLoadingRoleBreakdown(true)
      fetch(`/api/users/${editingUser.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch user data: ${res.status} ${res.statusText}`)
          }
          return res.json()
        })
        .then(data => {
          console.log('User data fetched:', { roleBreakdown: data.roleBreakdown, totalUniqueClients: data.totalUniqueClients })
          if (data.roleBreakdown && typeof data.roleBreakdown === 'object') {
            setRoleBreakdown(data.roleBreakdown)
          } else {
            setRoleBreakdown({})
          }
          setTotalUniqueClients(data.totalUniqueClients ?? null)
          // Teams are now managed centrally from Settings > Teams
        })
        .catch(err => {
          console.error('Failed to fetch role breakdown:', err)
          setRoleBreakdown({})
        })
        .finally(() => setLoadingRoleBreakdown(false))
    } else {
      // Reset all fields when sheet closes
      setSlackUsername('')
      setSelectedManagerId(null)
      setUserName('')
      setUserEmail('')
      setUserJobTitle('')
      setRoleBreakdown(null)
      setTotalUniqueClients(null)
      setOpenSection(null)
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

  // Pagination
  const totalPages = Math.ceil(sortedTeam.length / usersPerPage)
  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const paginatedTeam = sortedTeam.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter])

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
      // Save all user fields
      const updates: any = {}
      
      // Basic Information
      if (userName !== (editingUser.name || '')) {
        updates.name = userName.trim() || null
      }
      if (userEmail !== (editingUser.email || '')) {
        updates.email = userEmail.trim() || null
      }
      if (userJobTitle !== (editingUser.jobTitle || '')) {
        updates.jobTitle = userJobTitle.trim() || null
      }
      
      // Manager and Slack
      if (selectedManagerId !== (editingUser.managerId || null)) {
        updates.managerId = selectedManagerId
      }
      if (slackUsername !== (editingUser.slackUsername || '')) {
        updates.slackUsername = slackUsername.trim() || null
      }
      
      // Teams are now managed centrally from Settings > Teams
      // Removed teamIds from user edit modal

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

  // Role options for new user
  const roleOptions = [
    { value: 'VIEWER', label: 'Viewer' },
    { value: 'CONSULTANT', label: 'Consultant' },
    { value: 'IT_ENGINEER', label: 'IT Engineer' },
    { value: 'IT_MANAGER', label: 'IT Manager' },
    { value: 'ADMIN', label: 'Admin' },
  ]

  if (team.length === 0) {
    return (
      <>
        <div className="space-y-4">
          <div className="card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
              <Shield className="w-8 h-8 text-surface-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No team members yet</h3>
            <p className="text-surface-400 mb-4">
              Team members will appear here once they sign in with Google
            </p>
            {isAdmin && (
              <div className="mt-4">
                <button
                  onClick={() => setShowNewUserSheet(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add User Sheet */}
        <Sheet open={showNewUserSheet} onOpenChange={setShowNewUserSheet}>
          <SheetContent side="right" className="w-[500px] sm:w-[600px] bg-surface-900">
            <SheetHeader>
              <SheetTitle>Add New User</SheetTitle>
              <SheetDescription>
                Create a new user account. They will be able to sign in with their email via Google OAuth.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="input w-full"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="input w-full"
                  placeholder="Full name (optional)"
                />
              </div>

              <div>
                <label className="label">Role</label>
                <Combobox
                  value={newUserForm.role}
                  onChange={(value) => setNewUserForm({ ...newUserForm, role: value || 'VIEWER' })}
                  options={roleOptions}
                  placeholder="Select role..."
                />
                <p className="text-xs text-surface-500 mt-1">
                  Default role is Viewer. User can sign in with Google OAuth.
                </p>
              </div>
            </div>

            <SheetFooter className="mt-8">
              <button
                onClick={() => setShowNewUserSheet(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={!newUserForm.email.trim() || creatingUser}
                className="btn-primary flex items-center gap-2"
              >
                {creatingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create User
                  </>
                )}
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div className={cn("card", isRoleFilterOpen && "relative z-50")}>
      <div className="p-3 md:p-4 border-b border-surface-700/50 space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Team Members</h2>
          <span className="text-sm text-surface-500">{filteredTeam.length} of {team.length} members</span>
        </div>
        
        {/* Search and Role Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by name, email, or Slack username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2 md:gap-3">
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
              className="w-full md:w-[130px]"
              onOpenChange={setIsRoleFilterOpen}
            />
            {isAdmin && (
              <button
                onClick={() => setShowNewUserSheet(true)}
                className="btn-primary flex items-center gap-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add User</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-surface-700/50">
        {paginatedTeam.map((member, index) => {
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
              className="p-3 md:p-4 hover:bg-surface-800/30 transition-colors"
            >
              <div className="flex items-center gap-3 md:gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-10 h-10 md:w-12 md:h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-base md:text-lg font-semibold text-white">
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
                    <button
                      onClick={() => {
                        if (member.stats.assignedClients > 0) {
                          setShowClientAssignments(member.id)
                          setLoadingClientAssignments(true)
                          fetch(`/api/users/${member.id}`)
                            .then(res => res.json())
                            .then(data => {
                              setClientAssignments(data.clientAssignments || [])
                            })
                            .catch(err => {
                              console.error('Failed to fetch client assignments:', err)
                              toast.error('Failed to load client assignments')
                            })
                            .finally(() => setLoadingClientAssignments(false))
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1 text-surface-300 transition-colors group",
                        member.stats.assignedClients > 0 && "hover:text-white cursor-pointer"
                      )}
                      disabled={member.stats.assignedClients === 0}
                      title={member.stats.assignedClients > 0 ? "Click to view client assignments" : "No client assignments"}
                    >
                      <Building2 className={cn(
                        "w-4 h-4 text-surface-500 transition-colors",
                        member.stats.assignedClients > 0 && "group-hover:text-brand-400"
                      )} />
                      <span className="font-semibold">{member.stats.assignedClients}</span>
                    </button>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-surface-700/50 flex items-center justify-between">
          <div className="text-sm text-surface-400">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedTeam.length)} of {sortedTeam.length} members
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm transition-colors",
                      currentPage === pageNum
                        ? "bg-brand-500 text-white"
                        : "bg-surface-800 text-surface-300 hover:bg-surface-700"
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit/Merge Sheet */}
      <Sheet open={!!editingUser} onOpenChange={(open) => {
        if (!open) {
          setEditingUser(null)
        }
      }}>
        {editingUser && (
          <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto bg-surface-900">
            <SheetHeader>
              <div className="flex items-start gap-4">
                <label className="relative cursor-pointer group flex-shrink-0">
                  {editingUser.image ? (
                    <img src={editingUser.image} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-surface-700" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-xl border-2 border-surface-700">
                      {editingUser.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white transition-opacity">
                    Change
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAvatarUpload(editingUser.id, e.target.files?.[0] || null)}
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-xl">{editingUser.name || 'No name'}</SheetTitle>
                  <SheetDescription className="mt-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{editingUser.email || 'No email'}</span>
                    </div>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-8 space-y-6">
              {/* Basic Information Section - Collapsible */}
              <div>
                <button
                  onClick={() => toggleSection('basicInfo')}
                  className="w-full flex items-center justify-between mb-3 p-2 hover:bg-surface-800/50 rounded-lg transition-colors"
                >
                  <label className="block text-sm font-medium text-surface-300 cursor-pointer flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Basic Information
                  </label>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    showBasicInfo && 'rotate-180'
                  )} />
                </button>
                {showBasicInfo && (
                  <div className="space-y-4">
                    <div>
                      <label className="label flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        Name
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Full name"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="label flex items-center gap-2 mb-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="label flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4" />
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={userJobTitle}
                        onChange={(e) => setUserJobTitle(e.target.value)}
                        placeholder="e.g., Systems Engineer, IT Manager"
                        className="input w-full"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                          className="w-full"
                          showChevron={false}
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
                  </div>
                )}
              </div>

              {/* Role Breakdown Section */}
              <div className="mt-6 pt-6 border-t border-surface-700">
                <button
                  onClick={() => toggleSection('roleBreakdown')}
                  className="w-full flex items-center justify-between mb-3 p-2 hover:bg-surface-800/50 rounded-lg transition-colors"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                    <Building2 className="w-4 h-4" />
                    Client Role Breakdown
                  </label>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    showRoleBreakdown && 'rotate-180'
                  )} />
                </button>
                {showRoleBreakdown && (
                  <>
                    {loadingRoleBreakdown ? (
                      <div className="text-sm text-surface-400">Loading...</div>
                    ) : roleBreakdown && Object.keys(roleBreakdown).length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(roleBreakdown)
                            .sort(([a], [b]) => {
                              // Sort by role priority: SE, PRIMARY, SECONDARY, GRCE, IT_MANAGER
                              const order: Record<string, number> = {
                                SE: 1,
                                PRIMARY: 2,
                                SECONDARY: 3,
                                GRCE: 4,
                                IT_MANAGER: 5,
                              }
                              return (order[a] || 99) - (order[b] || 99)
                            })
                            .map(([role, count]) => {
                              const roleConfig = getRoleConfig(role)
                              const roleLabel = roleConfig?.label || role
                              const roleBadgeClasses = getRoleBadgeClasses(role)
                              return (
                                <div
                                  key={role}
                                  className={cn(
                                    'p-3 rounded-lg border h-20 flex flex-col justify-between',
                                    roleBadgeClasses || 'bg-surface-800 text-surface-300 border-surface-700'
                                  )}
                                >
                                  <div className="text-xs text-surface-500">
                                    {roleLabel}
                                  </div>
                                  <div className="text-lg font-semibold">{count}</div>
                                </div>
                              )
                            })}
                        </div>
                        {totalUniqueClients !== null && totalUniqueClients > 0 && (
                          <div className="mt-3 p-3 bg-surface-800/50 rounded-lg border border-surface-700">
                            <div className="text-xs text-surface-500 mb-1">Total Unique Clients</div>
                            <div className="text-xl font-semibold text-white">{totalUniqueClients}</div>
                            <div className="text-xs text-surface-500 mt-1">
                              Includes all roles and infra check assignments
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-surface-500">No client assignments</div>
                    )}
                  </>
                )}
              </div>


              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-surface-700">
                <button
                  onClick={() => toggleSection('quickActions')}
                  className="w-full flex items-center justify-between mb-3 p-2 hover:bg-surface-800/50 rounded-lg transition-colors"
                >
                  <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                    <Wrench className="w-4 h-4" />
                    Quick Actions
                  </label>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    showQuickActions && 'rotate-180'
                  )} />
                </button>
                {showQuickActions && (
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
                )}
              </div>
            </div>

            <SheetFooter className="mt-8">
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </SheetFooter>
          </SheetContent>
        )}
      </Sheet>

      {/* Add User Sheet */}
      <Sheet open={showNewUserSheet} onOpenChange={setShowNewUserSheet}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px] bg-surface-900">
          <SheetHeader>
            <SheetTitle>Add New User</SheetTitle>
            <SheetDescription>
              Create a new user account. They will be able to sign in with their email via Google OAuth.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="input w-full"
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                className="input w-full"
                placeholder="Full name (optional)"
              />
            </div>

            <div>
              <label className="label">Role</label>
              <Combobox
                value={newUserForm.role}
                onChange={(value) => setNewUserForm({ ...newUserForm, role: value || 'VIEWER' })}
                options={roleOptions}
                placeholder="Select role..."
              />
              <p className="text-xs text-surface-500 mt-1">
                Default role is Viewer. User can sign in with Google OAuth.
              </p>
            </div>
          </div>

          <SheetFooter className="mt-8">
            <button
              onClick={() => setShowNewUserSheet(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateUser}
              disabled={!newUserForm.email.trim() || creatingUser}
              className="btn-primary flex items-center gap-2"
            >
              {creatingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create User
                </>
              )}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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

      {/* Client Assignments Modal */}
      {showClientAssignments && (
        <Sheet open={!!showClientAssignments} onOpenChange={(open) => {
          if (!open) {
            setShowClientAssignments(null)
            setClientAssignments([])
          }
        }}>
          <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                Client Assignments
              </SheetTitle>
              <SheetDescription>
                {team.find(m => m.id === showClientAssignments)?.name || 'User'}'s client assignments and roles
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              {loadingClientAssignments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-surface-400" />
                </div>
              ) : clientAssignments.length === 0 ? (
                <div className="text-center py-8 text-surface-400">
                  No client assignments found
                </div>
              ) : (
                <div className="space-y-3">
                  {clientAssignments.map((assignment) => {
                    return (
                      <Link
                        key={assignment.clientId}
                        href={`/clients/${assignment.clientId}`}
                        className="block p-3 bg-surface-800 rounded-lg border border-surface-700 hover:border-surface-600 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-medium text-white hover:text-brand-400 transition-colors truncate flex-1 min-w-0">
                            {assignment.clientName}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                            {assignment.roles.map((role) => {
                              const roleAbbreviation = getRoleAbbreviation(role)
                              const roleBadgeClasses = getRoleBadgeClasses(role)
                              return (
                                <span
                                  key={role}
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded border",
                                    roleBadgeClasses
                                  )}
                                  title={getRoleConfig(role)?.label || role}
                                >
                                  {roleAbbreviation}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
