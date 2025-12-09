'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  Save,
  X,
  Mail,
  Laptop,
  Shield,
  Key,
  ClipboardCheck,
  GraduationCap,
  HardDrive,
  MailWarning,
  Boxes,
  Check,
  Database,
  Cloud,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/ui/combobox'
import { SearchInput } from '@/components/ui/search-input'

interface SystemCheckItem {
  id: string
  text: string
  description: string | null
  isOptional: boolean
  order: number
}

interface System {
  id: string
  name: string
  category: string
  icon: string | null
  description: string | null
  isActive: boolean
  source: 'APP' | 'NOTION' | 'SEEDED'
  checkItems: SystemCheckItem[]
}

const categoryLabels: Record<string, string> = {
  IDENTITY: 'Identity & Email',
  MDM: 'Device Management (MDM)',
  AV_EDR: 'Antivirus / EDR',
  PASSWORD: 'Password Manager',
  GRC: 'Compliance (GRC)',
  SECURITY_TRAINING: 'Security Training',
  BACKUP: 'Backup',
  EMAIL_SECURITY: 'Email Security',
  OTHER: 'Other',
}

const categoryIcons: Record<string, any> = {
  IDENTITY: Mail,
  MDM: Laptop,
  AV_EDR: Shield,
  PASSWORD: Key,
  GRC: ClipboardCheck,
  SECURITY_TRAINING: GraduationCap,
  BACKUP: HardDrive,
  EMAIL_SECURITY: MailWarning,
  OTHER: Boxes,
}

const categoryColors: Record<string, string> = {
  IDENTITY: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MDM: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  AV_EDR: 'bg-red-500/20 text-red-400 border-red-500/30',
  PASSWORD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  GRC: 'bg-green-500/20 text-green-400 border-green-500/30',
  SECURITY_TRAINING: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  BACKUP: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  EMAIL_SECURITY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  OTHER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const sourceLabels: Record<string, { label: string; icon: any; color: string }> = {
  APP: { label: 'Created', icon: Sparkles, color: 'bg-brand-500/20 text-brand-400' },
  NOTION: { label: 'Notion', icon: Cloud, color: 'bg-white/10 text-white' },
  SEEDED: { label: 'Preset', icon: Database, color: 'bg-surface-600 text-surface-300' },
}

export default function SystemsSettingsPage() {
  const [systems, setSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null)
  const [showNewSystemModal, setShowNewSystemModal] = useState(false)
  const [showEditSystemModal, setShowEditSystemModal] = useState<System | null>(null)
  const [showNewItemModal, setShowNewItemModal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Form state for new system
  const [newSystem, setNewSystem] = useState({
    name: '',
    category: 'OTHER',
    description: '',
  })

  // Form state for editing system
  const [editSystem, setEditSystem] = useState({
    name: '',
    category: '',
    description: '',
  })

  // Form state for new check item
  const [newItem, setNewItem] = useState({
    text: '',
    description: '',
    isOptional: false,
  })

  useEffect(() => {
    fetchSystems()
  }, [])

  const fetchSystems = async () => {
    try {
      const res = await fetch('/api/systems?includeItems=true')
      if (res.ok) {
        const data = await res.json()
        setSystems(data)
      }
    } catch (error) {
      console.error('Error fetching systems:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSystem = async () => {
    if (!newSystem.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSystem, source: 'APP' }),
      })
      if (res.ok) {
        await fetchSystems()
        setShowNewSystemModal(false)
        setNewSystem({ name: '', category: 'OTHER', description: '' })
      }
    } catch (error) {
      console.error('Error creating system:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateSystem = async () => {
    if (!showEditSystemModal || !editSystem.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/systems/${showEditSystemModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSystem),
      })
      if (res.ok) {
        await fetchSystems()
        setShowEditSystemModal(null)
      }
    } catch (error) {
      console.error('Error updating system:', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteSystem = async (id: string) => {
    try {
      const res = await fetch(`/api/systems/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchSystems()
      }
    } catch (error) {
      console.error('Error deleting system:', error)
    }
  }

  const createCheckItem = async (systemId: string) => {
    if (!newItem.text.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/systems/${systemId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      })
      if (res.ok) {
        await fetchSystems()
        setShowNewItemModal(null)
        setNewItem({ text: '', description: '', isOptional: false })
      }
    } catch (error) {
      console.error('Error creating check item:', error)
    } finally {
      setSaving(false)
    }
  }

  const deleteCheckItem = async (systemId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/systems/${systemId}/items/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchSystems()
      }
    } catch (error) {
      console.error('Error deleting check item:', error)
    }
  }

  const openEditModal = (system: System) => {
    setEditSystem({
      name: system.name,
      category: system.category,
      description: system.description || '',
    })
    setShowEditSystemModal(system)
  }

  // Filter systems based on search query
  const filteredSystems = searchQuery
    ? systems.filter((system) => {
        const query = searchQuery.toLowerCase()
        const matchesName = system.name.toLowerCase().includes(query)
        const matchesDescription = system.description?.toLowerCase().includes(query) || false
        const matchesCheckItems = system.checkItems.some(
          (item) =>
            item.text.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
        )
        return matchesName || matchesDescription || matchesCheckItems
      })
    : systems

  // Group systems by category
  const groupedSystems = filteredSystems.reduce((acc, system) => {
    if (!acc[system.category]) acc[system.category] = []
    acc[system.category].push(system)
    return acc
  }, {} as Record<string, System[]>)

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 bg-surface-800 rounded animate-pulse" />
            <div className="h-4 w-56 bg-surface-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-surface-800 rounded-lg animate-pulse" />
        </div>
        
        {/* Systems list skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-700 rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-32 bg-surface-700 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-surface-700 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-surface-700 rounded animate-pulse" />
              </div>
            </div>
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
          <h2 className="text-xl font-semibold text-white">Systems Database</h2>
          <p className="text-sm text-surface-400 mt-1">
            {filteredSystems.length} {searchQuery ? 'matching' : ''} systems with {filteredSystems.reduce((acc, s) => acc + s.checkItems.length, 0)} total check items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search systems..."
            className="w-64"
          />
          <button
            onClick={() => setShowNewSystemModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add System
          </button>
        </div>
      </div>

      {/* Systems by Category */}
      <div className="space-y-6">
        {Object.entries(groupedSystems).map(([category, categorySystems]) => {
          const Icon = categoryIcons[category] || Boxes
          return (
            <div key={category} className="card">
              <div className="p-4 border-b border-surface-700/50 flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', categoryColors[category])}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{categoryLabels[category] || category}</h3>
                  <p className="text-xs text-surface-500">{categorySystems.length} systems</p>
                </div>
              </div>

              <div className="divide-y divide-surface-700/50">
                {categorySystems.map((system) => {
                  const isExpanded = expandedSystem === system.id
                  const sourceInfo = sourceLabels[system.source] || sourceLabels.SEEDED
                  const SourceIcon = sourceInfo.icon

                  return (
                    <div key={system.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => setExpandedSystem(isExpanded ? null : system.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-surface-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-surface-500" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-white">{system.name}</h4>
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1', sourceInfo.color)}>
                                <SourceIcon className="w-3 h-3" />
                                {sourceInfo.label}
                              </span>
                            </div>
                            {system.description && (
                              <p className="text-sm text-surface-500">{system.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-surface-500 ml-2">
                            {system.checkItems.length} items
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(system)
                            }}
                            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
                            title="Edit system"
                          >
                            <Edit className="w-4 h-4 text-surface-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteSystem(system.id)
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete system"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded: Check Items */}
                      {isExpanded && (
                        <div className="mt-4 ml-7 space-y-2">
                          {system.checkItems.length === 0 ? (
                            <p className="text-sm text-surface-500 italic">No check items defined yet.</p>
                          ) : (
                            system.checkItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 p-3 bg-surface-800/50 rounded-lg group"
                              >
                                <Check className="w-4 h-4 text-surface-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className={cn('text-sm', item.isOptional ? 'text-surface-400' : 'text-surface-200')}>
                                    {item.text}
                                    {item.isOptional && (
                                      <span className="text-xs text-surface-500 ml-2">(optional)</span>
                                    )}
                                  </p>
                                  {item.description && (
                                    <p className="text-xs text-surface-500 mt-1">{item.description}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => deleteCheckItem(system.id, item.id)}
                                  className="p-1 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <X className="w-3 h-3 text-red-400" />
                                </button>
                              </div>
                            ))
                          )}

                          <button
                            onClick={() => setShowNewItemModal(system.id)}
                            className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 p-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Check Item
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* New System Modal */}
      {showNewSystemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-md p-6 relative">
            <h3 className="text-lg font-semibold text-white mb-4">Add New System</h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">System Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., CrowdStrike, Okta, 1Password..."
                  value={newSystem.name}
                  onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <Combobox
                  value={newSystem.category}
                  onChange={(value) => setNewSystem({ ...newSystem, category: value })}
                  options={Object.entries(categoryLabels).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                  placeholder="Select category..."
                />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Brief description of the system..."
                  value={newSystem.description}
                  onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewSystemModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={createSystem}
                disabled={!newSystem.name.trim() || saving}
                className="btn-primary"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add System'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit System Modal */}
      {showEditSystemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Edit System</h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">System Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., CrowdStrike, Okta, 1Password..."
                  value={editSystem.name}
                  onChange={(e) => setEditSystem({ ...editSystem, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={editSystem.category}
                  onChange={(e) => setEditSystem({ ...editSystem, category: e.target.value })}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Brief description of the system..."
                  value={editSystem.description}
                  onChange={(e) => setEditSystem({ ...editSystem, description: e.target.value })}
                />
              </div>

              {showEditSystemModal.source && (
                <div className="pt-2 border-t border-surface-700">
                  <p className="text-xs text-surface-500">
                    Source: <span className="text-surface-300">{sourceLabels[showEditSystemModal.source]?.label || 'Unknown'}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditSystemModal(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={updateSystem}
                disabled={!editSystem.name.trim() || saving}
                className="btn-primary"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Check Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Add Check Item</h3>
            
            <div className="space-y-4">
              <div>
                <label className="label">Check Item Text</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="What should be checked..."
                  value={newItem.text}
                  onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Additional context or instructions..."
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItem.isOptional}
                  onChange={(e) => setNewItem({ ...newItem, isOptional: e.target.checked })}
                  className="w-4 h-4 rounded border-surface-500 bg-surface-700 text-brand-500"
                />
                <span className="text-sm text-surface-300">Mark as optional</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewItemModal(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => createCheckItem(showNewItemModal)}
                disabled={!newItem.text.trim() || saving}
                className="btn-primary"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
