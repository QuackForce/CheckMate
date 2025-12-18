'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Save,
  X,
  UserCog,
  AlertCircle,
  Info,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SearchInput } from '@/components/ui/search-input'
import { hasPermission } from '@/lib/permissions'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface Role {
  id: string
  roleKey: string
  label: string
  abbreviation: string
  bgColor: string
  textColor: string
  borderColor: string
  priority: number
  allowMultiple: boolean
  maxAssignments: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export default function RolesSettingsPage() {
  const { data: session } = useSession()
  const canEdit = hasPermission(session?.user?.role, 'settings:edit')
  const isAdmin = session?.user?.role === 'ADMIN'
  
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({})

  // Form state
  const [formData, setFormData] = useState({
    roleKey: '',
    label: '',
    abbreviation: '',
    bgColor: 'bg-surface-700/20',
    textColor: 'text-surface-400',
    borderColor: 'border-surface-600/30',
    priority: 99,
    allowMultiple: true,
    maxAssignments: 0,
    isActive: true,
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data)
        
        // Fetch assignment counts for each role
        const counts: Record<string, number> = {}
        for (const role of data) {
          try {
            const countRes = await fetch(`/api/roles/${role.id}/assignments`)
            if (countRes.ok) {
              const countData = await countRes.json()
              counts[role.roleKey] = countData.count || 0
            }
          } catch (err) {
            // Ignore errors, just set to 0
            counts[role.roleKey] = 0
          }
        }
        setAssignmentCounts(counts)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.roleKey.trim() || !formData.label.trim() || !formData.abbreviation.trim()) {
      toast.error('Role Key, Label, and Abbreviation are required')
      return
    }

    // Validate roleKey format
    if (!/^[A-Z0-9_]+$/.test(formData.roleKey)) {
      toast.error('Role Key must be uppercase alphanumeric with underscores only (e.g., JR_SYSTEM_ENGINEER)')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          roleKey: formData.roleKey.toUpperCase(),
        }),
      })

      if (res.ok) {
        toast.success('Role created successfully')
        setShowNewModal(false)
        setFormData({
          roleKey: '',
          label: '',
          abbreviation: '',
          bgColor: 'bg-surface-700/20',
          textColor: 'text-surface-400',
          borderColor: 'border-surface-600/30',
          priority: 99,
          allowMultiple: true,
          maxAssignments: 0,
          isActive: true,
        })
        fetchRoles()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create role')
      }
    } catch (error) {
      toast.error('Failed to create role')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingRole) return

    if (!formData.label.trim() || !formData.abbreviation.trim()) {
      toast.error('Label and Abbreviation are required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Role updated successfully')
        setEditingRole(null)
        fetchRoles()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to update role')
      }
    } catch (error) {
      toast.error('Failed to update role')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete "${role.label}"? This cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Role deleted successfully')
        fetchRoles()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete role')
        if (error.assignmentCount) {
          toast.info(`${error.assignmentCount} client assignment(s) are using this role. Remove them first.`)
        }
      }
    } catch (error) {
      toast.error('Failed to delete role')
    }
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setFormData({
      roleKey: role.roleKey, // Read-only when editing
      label: role.label,
      abbreviation: role.abbreviation,
      bgColor: role.bgColor,
      textColor: role.textColor,
      borderColor: role.borderColor,
      priority: role.priority,
      allowMultiple: role.allowMultiple,
      maxAssignments: role.maxAssignments,
      isActive: role.isActive,
    })
  }

  const openNewModal = () => {
    setEditingRole(null)
    setFormData({
      roleKey: '',
      label: '',
      abbreviation: '',
      bgColor: 'bg-surface-700/20',
      textColor: 'text-surface-400',
      borderColor: 'border-surface-600/30',
      priority: 99,
      allowMultiple: true,
      maxAssignments: 0,
      isActive: true,
    })
    setShowNewModal(true)
  }

  const filteredRoles = roles.filter(role =>
    role.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.roleKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
    role.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Client Engineer Roles</h2>
          <p className="text-sm text-surface-400 mt-1">
            Manage role configurations for client assignments. Configure labels, colors, and assignment limits.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openNewModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Role
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="card p-4 bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-300 font-medium mb-1">About Role Management</p>
            <p className="text-xs text-blue-400/80">
              Configure how roles appear throughout the app. To add a completely new role type, you'll need to add it to the Prisma enum first, then configure it here. 
              Existing roles can be fully customized through this interface.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search roles..."
          className="flex-1 max-w-md"
        />
        <span className="text-sm text-surface-500">
          {filteredRoles.length} role{filteredRoles.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Roles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoles.map((role) => {
          const assignmentCount = assignmentCounts[role.roleKey] || 0
          return (
            <div
              key={role.id}
              className={cn(
                "card p-4 space-y-3",
                !role.isActive && "opacity-60"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{role.label}</h3>
                    {!role.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-700 text-surface-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500">
                    Key: <code className="text-surface-400">{role.roleKey}</code>
                  </p>
                  <p className="text-xs text-surface-500">
                    Abbreviation: {role.abbreviation}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(role)}
                      className="p-1.5 text-surface-400 hover:text-brand-400 transition-colors"
                      title="Edit role"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(role)}
                      disabled={assignmentCount > 0}
                      className="p-1.5 text-surface-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={assignmentCount > 0 ? `Cannot delete: ${assignmentCount} assignment(s) in use` : 'Delete role'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Preview Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-500">Preview:</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded border",
                  role.bgColor,
                  role.textColor,
                  role.borderColor
                )}>
                  {role.abbreviation}
                </span>
              </div>

              {/* Settings */}
              <div className="space-y-1 text-xs text-surface-500">
                <div className="flex items-center justify-between">
                  <span>Priority:</span>
                  <span className="text-surface-400">{role.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Multiple Allowed:</span>
                  <span className="text-surface-400">{role.allowMultiple ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Max Assignments:</span>
                  <span className="text-surface-400">
                    {role.maxAssignments === 0 ? 'Unlimited' : role.maxAssignments}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>In Use:</span>
                  <span className={cn(
                    "font-medium",
                    assignmentCount > 0 ? "text-brand-400" : "text-surface-500"
                  )}>
                    {assignmentCount} assignment{assignmentCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredRoles.length === 0 && (
        <div className="card p-12 text-center">
          <UserCog className="w-12 h-12 text-surface-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No roles found</h3>
          <p className="text-surface-400">
            {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first role'}
          </p>
        </div>
      )}

      {/* New/Edit Modal */}
      <Sheet open={showNewModal || editingRole !== null} onOpenChange={(open) => {
        if (!open) {
          setShowNewModal(false)
          setEditingRole(null)
        }
      }}>
        <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto bg-surface-900 border border-surface-700">
          <SheetHeader>
            <SheetTitle className="text-white">
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </SheetTitle>
            <SheetDescription className="text-surface-400">
              {editingRole 
                ? 'Update role configuration. Changes will apply throughout the app.'
                : 'Create a new role configuration. Note: The role must exist in the Prisma enum first.'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Role Key */}
            <div>
              <label className="label">Role Key *</label>
              <input
                type="text"
                value={formData.roleKey}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')
                  setFormData({ ...formData, roleKey: value })
                }}
                className="input"
                placeholder="JR_SYSTEM_ENGINEER"
                disabled={!!editingRole}
                required
              />
              <p className="text-xs text-surface-500 mt-1">
                Uppercase alphanumeric with underscores. Must match Prisma enum value.
                {editingRole && ' (Cannot be changed after creation)'}
              </p>
            </div>

            {/* Label */}
            <div>
              <label className="label">Display Label *</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="input"
                placeholder="Jr System Engineer"
                required
              />
              <p className="text-xs text-surface-500 mt-1">
                Full name shown in the UI
              </p>
            </div>

            {/* Abbreviation */}
            <div>
              <label className="label">Abbreviation *</label>
              <input
                type="text"
                value={formData.abbreviation}
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                className="input"
                placeholder="Jr SE"
                required
              />
              <p className="text-xs text-surface-500 mt-1">
                Short form used in compact displays
              </p>
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-surface-400" />
                <label className="label">Colors</label>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Background</label>
                  <input
                    type="text"
                    value={formData.bgColor}
                    onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                    className="input text-sm"
                    placeholder="bg-brand-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Text</label>
                  <input
                    type="text"
                    value={formData.textColor}
                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                    className="input text-sm"
                    placeholder="text-brand-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Border</label>
                  <input
                    type="text"
                    value={formData.borderColor}
                    onChange={(e) => setFormData({ ...formData, borderColor: e.target.value })}
                    className="input text-sm"
                    placeholder="border-brand-500/30"
                  />
                </div>
              </div>
              
              {/* Color Preview */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-500">Preview:</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded border",
                  formData.bgColor,
                  formData.textColor,
                  formData.borderColor
                )}>
                  {formData.abbreviation || 'Preview'}
                </span>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="label">Display Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 99 })}
                className="input"
                min="1"
              />
              <p className="text-xs text-surface-500 mt-1">
                Lower numbers appear first. Default: 99
              </p>
            </div>

            {/* Assignment Settings */}
            <div className="space-y-4 p-4 bg-surface-800/50 rounded-lg border border-surface-700">
              <h4 className="text-sm font-medium text-white">Assignment Settings</h4>
              
              <div className="flex items-center justify-between">
                <label className="text-sm text-surface-300">Allow Multiple Assignments</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, allowMultiple: !formData.allowMultiple })}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors",
                    formData.allowMultiple ? "bg-brand-500" : "bg-surface-700"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                      formData.allowMultiple ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {formData.allowMultiple && (
                <div>
                  <label className="text-sm text-surface-300 mb-1 block">Max Assignments</label>
                  <input
                    type="number"
                    value={formData.maxAssignments}
                    onChange={(e) => setFormData({ ...formData, maxAssignments: parseInt(e.target.value) || 0 })}
                    className="input text-sm"
                    min="0"
                  />
                  <p className="text-xs text-surface-500 mt-1">
                    0 = Unlimited
                  </p>
                </div>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-lg border border-surface-700">
              <div>
                <label className="text-sm font-medium text-white">Active</label>
                <p className="text-xs text-surface-500 mt-0.5">
                  Inactive roles won't appear in assignment dropdowns
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors",
                  formData.isActive ? "bg-brand-500" : "bg-surface-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                    formData.isActive ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          <SheetFooter className="mt-8">
            <button
              type="button"
              onClick={() => {
                setShowNewModal(false)
                setEditingRole(null)
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={editingRole ? handleUpdate : handleCreate}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingRole ? 'Update Role' : 'Create Role'}
                </>
              )}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

