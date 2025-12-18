'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Save,
  X,
  Shield,
  Lock,
  Building2,
  Briefcase,
  Boxes,
  Database,
  Cloud,
  Sparkles,
  Download,
  ChevronDown,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
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
import { Button } from '@/components/ui/button'

interface Framework {
  id: string
  name: string
  category: string
  description: string | null
  isActive: boolean
  source: 'APP' | 'NOTION' | 'SEEDED'
}

interface AuditType {
  id: string
  name: string
  description: string | null
  isActive: boolean
  order: number
}

const categoryLabels: Record<string, string> = {
  SECURITY: 'Security',
  PRIVACY: 'Privacy',
  GOVERNMENT: 'Government',
  INDUSTRY: 'Industry',
  OTHER: 'Other',
}

const categoryIcons: Record<string, any> = {
  SECURITY: Shield,
  PRIVACY: Lock,
  GOVERNMENT: Building2,
  INDUSTRY: Briefcase,
  OTHER: Boxes,
}

const categoryColors: Record<string, string> = {
  SECURITY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PRIVACY: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  GOVERNMENT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  INDUSTRY: 'bg-green-500/20 text-green-400 border-green-500/30',
  OTHER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const sourceLabels: Record<string, { label: string; icon: any; color: string }> = {
  APP: { label: 'Created', icon: Sparkles, color: 'bg-brand-500/20 text-brand-400' },
  NOTION: { label: 'Notion', icon: Cloud, color: 'bg-white/10 text-white' },
  SEEDED: { label: 'Preset', icon: Database, color: 'bg-surface-600 text-surface-300' },
}

export default function FrameworksSettingsPage() {
  const { data: session } = useSession()
  const canEdit = hasPermission(session?.user?.role, 'settings:edit')
  
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingFramework, setEditingFramework] = useState<Framework | null>(null)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Audit types state (for framework edit sheet)
  const [frameworkAuditTypes, setFrameworkAuditTypes] = useState<AuditType[]>([])
  const [loadingAuditTypes, setLoadingAuditTypes] = useState(false)
  const [editingAuditType, setEditingAuditType] = useState<AuditType | null>(null)
  const [auditTypeFormData, setAuditTypeFormData] = useState({
    name: '',
    description: '',
    order: 0,
  })
  // Audit type counts for display in cards
  const [auditTypeCounts, setAuditTypeCounts] = useState<Record<string, number>>({})
  // Delete confirmation state
  const [auditTypeToDelete, setAuditTypeToDelete] = useState<AuditType | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'SECURITY',
    description: '',
  })
  
  // Collapsible sections state (accordion - only one open at a time)
  const [openSection, setOpenSection] = useState<string | null>(null)
  
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  useEffect(() => {
    fetchFrameworks()
  }, [])

  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/frameworks?activeOnly=false')
      if (res.ok) {
        const data = await res.json()
        setFrameworks(data)
        // Fetch audit type counts for all frameworks
        fetchAuditTypeCounts(data)
      }
    } catch (error) {
      console.error('Failed to fetch frameworks:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAuditTypeCounts = async (frameworks: Framework[]) => {
    try {
      const counts: Record<string, number> = {}
      await Promise.all(
        frameworks.map(async (framework) => {
          try {
            const res = await fetch(`/api/audit-types?frameworkId=${framework.id}&activeOnly=false`)
            if (res.ok) {
              const auditTypes = await res.json()
              counts[framework.id] = auditTypes.length
            }
          } catch (error) {
            counts[framework.id] = 0
          }
        })
      )
      setAuditTypeCounts(counts)
    } catch (error) {
      console.error('Failed to fetch audit type counts:', error)
    }
  }

  const handleSeedFrameworks = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/frameworks/seed', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        toast.success(data.message)
        fetchFrameworks()
      } else {
        toast.error(data.error || 'Failed to seed frameworks')
      }
    } catch (error) {
      toast.error('Failed to seed frameworks')
    } finally {
      setSeeding(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Framework created')
        setShowNewModal(false)
        setFormData({ name: '', category: 'SECURITY', description: '' })
        await fetchFrameworks()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to create framework')
      }
    } catch (error) {
      toast.error('Failed to create framework')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingFramework || !formData.name.trim()) return

    setSaving(true)
    try {
      const res = await fetch(`/api/frameworks/${editingFramework.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Framework updated')
        setEditingFramework(null)
        await fetchFrameworks()
      } else {
        toast.error('Failed to update framework')
      }
    } catch (error) {
      toast.error('Failed to update framework')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this framework?')) return

    try {
      const res = await fetch(`/api/frameworks/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Framework deleted')
        fetchFrameworks()
      } else {
        toast.error('Failed to delete framework')
      }
    } catch (error) {
      toast.error('Failed to delete framework')
    }
  }

  const handleToggleActive = async (framework: Framework) => {
    try {
      const res = await fetch(`/api/frameworks/${framework.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !framework.isActive }),
      })

      if (res.ok) {
        fetchFrameworks()
      }
    } catch (error) {
      toast.error('Failed to update framework')
    }
  }

  const openEditModal = async (framework: Framework) => {
    setFormData({
      name: framework.name,
      category: framework.category,
      description: framework.description || '',
    })
    setEditingFramework(framework)
    
    // Fetch audit types for this framework
    setLoadingAuditTypes(true)
    try {
      const res = await fetch(`/api/audit-types?frameworkId=${framework.id}&activeOnly=false`)
      if (res.ok) {
        const data = await res.json()
        setFrameworkAuditTypes(data)
      }
    } catch (error) {
      console.error('Failed to fetch audit types:', error)
    } finally {
      setLoadingAuditTypes(false)
    }
  }

  const openAuditTypeForm = (auditType?: AuditType) => {
    if (auditType) {
      setEditingAuditType(auditType)
      setAuditTypeFormData({
        name: auditType.name,
        description: auditType.description || '',
        order: auditType.order,
      })
    } else {
      // Create new - use a placeholder object to indicate "new" mode
      setEditingAuditType({ id: '', name: '', description: null, isActive: true, order: 0 } as AuditType)
      setAuditTypeFormData({ name: '', description: '', order: 0 })
    }
  }

  const handleAuditTypeSave = async () => {
    if (!editingFramework || !auditTypeFormData.name.trim() || !editingAuditType) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const isEdit = editingAuditType.id !== ''
      const url = isEdit
        ? `/api/audit-types/${editingAuditType.id}`
        : '/api/audit-types'
      
      const method = isEdit ? 'PATCH' : 'POST'
      const body = isEdit
        ? { name: auditTypeFormData.name, description: auditTypeFormData.description, order: auditTypeFormData.order }
        : { frameworkId: editingFramework.id, name: auditTypeFormData.name, description: auditTypeFormData.description, order: auditTypeFormData.order }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success(isEdit ? 'Audit type updated' : 'Audit type created')
        setEditingAuditType(null)
        setAuditTypeFormData({ name: '', description: '', order: 0 })
        // Refresh audit types
        if (editingFramework) {
          const res = await fetch(`/api/audit-types?frameworkId=${editingFramework.id}&activeOnly=false`)
          if (res.ok) {
            const data = await res.json()
            setFrameworkAuditTypes(data)
            // Update count in the card display
            setAuditTypeCounts(prev => ({ ...prev, [editingFramework.id]: data.length }))
          }
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save audit type')
      }
    } catch (error) {
      toast.error('Failed to save audit type')
    } finally {
      setSaving(false)
    }
  }

  const handleAuditTypeDelete = async () => {
    if (!auditTypeToDelete || !editingFramework) return

    try {
      const res = await fetch(`/api/audit-types/${auditTypeToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Audit type deleted')
        setAuditTypeToDelete(null)
        // Refresh audit types
        const res = await fetch(`/api/audit-types?frameworkId=${editingFramework.id}&activeOnly=false`)
        if (res.ok) {
          const data = await res.json()
          setFrameworkAuditTypes(data)
          // Update count in the card display
          setAuditTypeCounts(prev => ({ ...prev, [editingFramework.id]: data.length }))
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete audit type')
        setAuditTypeToDelete(null)
      }
    } catch (error) {
      toast.error('Failed to delete audit type')
      setAuditTypeToDelete(null)
    }
  }

  const handleAuditTypeToggleActive = async (auditType: AuditType) => {
    if (!editingFramework) return

    try {
      const res = await fetch(`/api/audit-types/${auditType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !auditType.isActive }),
      })

      if (res.ok) {
        // Refresh audit types
        const res = await fetch(`/api/audit-types?frameworkId=${editingFramework.id}&activeOnly=false`)
        if (res.ok) {
          const data = await res.json()
          setFrameworkAuditTypes(data)
          // Update count in the card display
          setAuditTypeCounts(prev => ({ ...prev, [editingFramework.id]: data.length }))
        }
      }
    } catch (error) {
      toast.error('Failed to update audit type')
    }
  }

  // Filter frameworks based on search query
  const filteredFrameworks = searchQuery
    ? frameworks.filter((framework) => {
        const query = searchQuery.toLowerCase()
        const matchesName = framework.name.toLowerCase().includes(query)
        const matchesDescription = framework.description?.toLowerCase().includes(query) || false
        return matchesName || matchesDescription
      })
    : frameworks

  // Group frameworks by category
  const groupedFrameworks = filteredFrameworks.reduce((acc, framework) => {
    const cat = framework.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(framework)
    return acc
  }, {} as Record<string, Framework[]>)

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
          <h2 className="text-xl font-semibold text-white">Compliance Frameworks</h2>
          <p className="text-sm text-surface-400 mt-1">
            {filteredFrameworks.length} {searchQuery ? 'matching' : ''} frameworks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search frameworks..."
            className="w-64"
          />
          {frameworks.length === 0 && canEdit && (
            <button
              onClick={handleSeedFrameworks}
              disabled={seeding}
              className="btn-ghost flex items-center gap-2"
            >
              <Download className={cn("w-4 h-4", seeding && "animate-spin")} />
              {seeding ? 'Loading...' : 'Load Presets'}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                setFormData({ name: '', category: 'SECURITY', description: '' })
                setShowNewModal(true)
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Framework
            </button>
          )}
        </div>
      </div>

      {/* Frameworks by Category */}
      {Object.entries(categoryLabels).map(([category, label]) => {
        const categoryFrameworks = groupedFrameworks[category] || []
        if (categoryFrameworks.length === 0) return null

        const Icon = categoryIcons[category]
        const colorClass = categoryColors[category]

        return (
          <div key={category} className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("p-2 rounded-lg", colorClass.split(' ')[0])}>
                <Icon className={cn("w-5 h-5", colorClass.split(' ')[1])} />
              </div>
              <h3 className="text-lg font-medium text-white">{label}</h3>
              <span className="text-sm text-surface-500">({categoryFrameworks.length})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryFrameworks.map(framework => {
                const sourceInfo = sourceLabels[framework.source]
                const SourceIcon = sourceInfo.icon

                return (
                  <div
                    key={framework.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      framework.isActive 
                        ? "bg-surface-800/50 border-surface-700" 
                        : "bg-surface-900/50 border-surface-800 opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-white truncate">{framework.name}</h4>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs",
                            sourceInfo.color
                          )}>
                            <SourceIcon className="w-3 h-3" />
                            {sourceInfo.label}
                          </span>
                        </div>
                        {framework.description && (
                          <p className="text-xs text-surface-400 mt-1 line-clamp-2">
                            {framework.description}
                          </p>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => openEditModal(framework)}
                            className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5 text-surface-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(framework.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleActive(framework)}
                          className={cn(
                            "text-xs px-2 py-1 rounded",
                            framework.isActive 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-surface-700 text-surface-400"
                          )}
                        >
                          {framework.isActive ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded",
                          framework.isActive 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-surface-700 text-surface-400"
                        )}>
                          {framework.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    {/* Audit Types Display */}
                    <div className="mt-3 pt-3 border-t border-surface-700/50">
                      <div className="flex items-center gap-1.5 text-xs text-surface-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Audit Types</span>
                        {auditTypeCounts[framework.id] !== undefined && (
                          <span className="text-surface-500">
                            ({auditTypeCounts[framework.id]})
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {frameworks.length === 0 && (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No frameworks yet</h3>
          <p className="text-surface-400 mb-4">
            {canEdit ? 'Load preset frameworks or create your own to get started.' : 'No frameworks have been configured yet.'}
          </p>
          {canEdit && (
            <button
              onClick={handleSeedFrameworks}
              disabled={seeding}
              className="btn-primary"
            >
              {seeding ? 'Loading...' : 'Load Preset Frameworks'}
            </button>
          )}
        </div>
      )}

      {/* New/Edit Sheet */}
      <Sheet open={showNewModal || !!editingFramework} onOpenChange={(open) => {
        if (!open && !auditTypeToDelete) {
          setShowNewModal(false)
          setEditingFramework(null)
          setEditingAuditType(null)
          setFrameworkAuditTypes([])
          setAuditTypeFormData({ name: '', description: '', order: 0 })
          setOpenSection(null) // Reset sections (all closed)
        }
      }}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingFramework ? 'Edit Framework' : 'New Framework'}
            </SheetTitle>
            <SheetDescription>
              {editingFramework ? 'Update framework details and manage audit types' : 'Create a new compliance framework'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
              {/* Framework Details Section */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection('frameworkDetails')}
                  className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors"
                >
                  <label className="block text-sm font-medium text-surface-300 cursor-pointer flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Framework Details
                  </label>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-surface-400 transition-transform',
                    openSection === 'frameworkDetails' && 'rotate-180'
                  )} />
                </button>
                {openSection === 'frameworkDetails' && (
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
                  placeholder="e.g., SOC 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-1">
                  Category *
                </label>
                <Combobox
                  value={formData.category}
                  onChange={(value) => setFormData({ ...formData, category: value })}
                  options={Object.entries(categoryLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  placeholder="Select category..."
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
            </div>
                )}
              </div>

              {/* Audit Types Section - Only show when editing */}
              {editingFramework && (
                <div className="mt-6 pt-6 border-t border-surface-700">
                  <button
                    type="button"
                    onClick={() => toggleSection('auditTypes')}
                    className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors mb-3"
                  >
                    <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                      <FileText className="w-4 h-4" />
                      Audit Types
                    </label>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-surface-400 transition-transform',
                      openSection === 'auditTypes' && 'rotate-180'
                    )} />
                  </button>

                  {openSection === 'auditTypes' && (
                  <>

                  {loadingAuditTypes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-surface-500" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {frameworkAuditTypes.length > 0 ? (
                        frameworkAuditTypes.map((auditType) => (
                          <div
                            key={auditType.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border",
                              auditType.isActive
                                ? "bg-surface-800/50 border-surface-700"
                                : "bg-surface-900/50 border-surface-800 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className={cn(
                                "text-xs px-2 py-1 rounded",
                                auditType.isActive
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-surface-700 text-surface-500"
                              )}>
                                {auditType.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white">{auditType.name}</div>
                                {auditType.description && (
                                  <div className="text-xs text-surface-400 mt-0.5">{auditType.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => handleAuditTypeToggleActive(auditType)}
                                className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                                title={auditType.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {auditType.isActive ? (
                                  <Shield className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Shield className="w-4 h-4 text-surface-500" />
                                )}
                              </button>
                              <button
                                onClick={() => openAuditTypeForm(auditType)}
                                className="p-1.5 hover:bg-surface-700 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 text-surface-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setAuditTypeToDelete(auditType)
                                }}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 border border-dashed border-surface-700 rounded-lg">
                          <FileText className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                          <p className="text-sm text-surface-400">No audit types yet</p>
                          <p className="text-xs text-surface-500 mt-1">Add audit types for this framework</p>
                        </div>
                      )}
                      
                      {/* Add Type Button - Card Style */}
                      {!editingAuditType && (
                        <button
                          type="button"
                          onClick={() => openAuditTypeForm()}
                          className="w-full flex items-center gap-2 p-3 bg-surface-800/50 border-2 border-dashed border-surface-600 rounded-lg hover:border-brand-500/50 hover:bg-surface-800 transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-green-400" />
                          </div>
                          <span className="text-sm text-surface-300">Add Audit Type</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Add/Edit Audit Type Form */}
                  {editingAuditType && (
                    <div className="mt-4 p-4 bg-surface-800/50 rounded-lg border border-surface-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-white">
                          {editingAuditType.id ? 'Edit Audit Type' : 'New Audit Type'}
                        </h4>
              <button
                onClick={() => {
                            setEditingAuditType(null)
                            setAuditTypeFormData({ name: '', description: '', order: 0 })
                          }}
                          className="p-1 hover:bg-surface-700 rounded"
                        >
                          <X className="w-4 h-4 text-surface-400" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-surface-300 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={auditTypeFormData.name}
                            onChange={e => setAuditTypeFormData({ ...auditTypeFormData, name: e.target.value })}
                            className="input w-full text-sm"
                            placeholder="e.g., Type I, Type II"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-surface-300 mb-1">
                            Description
                          </label>
                          <textarea
                            value={auditTypeFormData.description}
                            onChange={e => setAuditTypeFormData({ ...auditTypeFormData, description: e.target.value })}
                            className="input w-full text-sm"
                            rows={2}
                            placeholder="Optional description..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-surface-300 mb-1">
                            Order
                          </label>
                          <input
                            type="number"
                            value={auditTypeFormData.order}
                            onChange={e => setAuditTypeFormData({ ...auditTypeFormData, order: parseInt(e.target.value) || 0 })}
                            className="input w-full text-sm"
                            placeholder="0"
                            min="0"
                          />
                          <p className="text-xs text-surface-500 mt-1">Lower numbers appear first</p>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            onClick={() => {
                              setEditingAuditType(null)
                              setAuditTypeFormData({ name: '', description: '', order: 0 })
                            }}
                            variant="outline"
                            size="sm"
              >
                Cancel
                          </Button>
                          <Button
                            onClick={handleAuditTypeSave}
                            disabled={saving || !auditTypeFormData.name.trim()}
                            size="sm"
                            className="btn-primary"
              >
                {saving ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                Saving...
                              </>
                ) : (
                              editingAuditType ? 'Update' : 'Create'
                )}
                          </Button>
            </div>
          </div>
        </div>
      )}
                  </>
                  )}
                </div>
              )}
          </div>

          <SheetFooter className="mt-8">
            <Button
              onClick={() => {
                setShowNewModal(false)
                setEditingFramework(null)
                setEditingAuditType(null)
                setFrameworkAuditTypes([])
                setAuditTypeFormData({ name: '', description: '', order: 0 })
              }}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={editingFramework ? handleUpdate : handleCreate}
              disabled={saving || !formData.name.trim()}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingFramework ? 'Update Framework' : 'Create Framework'}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Audit Type Confirmation Modal */}
      {auditTypeToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)',
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAuditTypeToDelete(null)
            }
          }}
        >
          <div 
            className="card w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  Delete Audit Type
                </h3>
                <p className="text-sm text-surface-400 mt-1">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-surface-800 rounded-lg">
              <p className="text-sm text-surface-300">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-white">
                  "{auditTypeToDelete.name}"
                </span>?
              </p>
              <p className="text-xs text-surface-500 mt-2">
                This audit type will be permanently removed from the framework.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setAuditTypeToDelete(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleAuditTypeDelete()
                }}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

