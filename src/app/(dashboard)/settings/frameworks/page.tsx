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
  Shield,
  Lock,
  Building2,
  Briefcase,
  Boxes,
  Database,
  Cloud,
  Sparkles,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
import { SearchInput } from '@/components/ui/search-input'
import { hasPermission } from '@/lib/permissions'

interface Framework {
  id: string
  name: string
  category: string
  description: string | null
  isActive: boolean
  source: 'APP' | 'NOTION' | 'SEEDED'
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

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'SECURITY',
    description: '',
  })

  useEffect(() => {
    fetchFrameworks()
  }, [])

  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/frameworks?activeOnly=false')
      if (res.ok) {
        const data = await res.json()
        setFrameworks(data)
      }
    } catch (error) {
      console.error('Failed to fetch frameworks:', error)
    } finally {
      setLoading(false)
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
        fetchFrameworks()
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
        fetchFrameworks()
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

  const openEditModal = (framework: Framework) => {
    setFormData({
      name: framework.name,
      category: framework.category,
      description: framework.description || '',
    })
    setEditingFramework(framework)
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

      {/* New/Edit Modal */}
      {(showNewModal || editingFramework) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-xl p-6 w-full max-w-md border border-surface-700 relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingFramework ? 'Edit Framework' : 'New Framework'}
              </h3>
              <button
                onClick={() => {
                  setShowNewModal(false)
                  setEditingFramework(null)
                }}
                className="p-1 hover:bg-surface-800 rounded"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>

            <div className="space-y-4">
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

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowNewModal(false)
                  setEditingFramework(null)
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={editingFramework ? handleUpdate : handleCreate}
                disabled={saving || !formData.name.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingFramework ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

