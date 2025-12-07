'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  X, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

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
  checkItems: SystemCheckItem[]
}

interface ClientSystem {
  id: string
  notes: string | null
  system: System
}

interface ClientSystemsProps {
  clientId: string
  initialSystems?: ClientSystem[]
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

export function ClientSystems({ clientId, initialSystems = [] }: ClientSystemsProps) {
  const [clientSystems, setClientSystems] = useState<ClientSystem[]>(initialSystems)
  const [allSystems, setAllSystems] = useState<System[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchClientSystems()
    fetchAllSystems()
  }, [clientId])

  const fetchClientSystems = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/systems`)
      if (res.ok) {
        const data = await res.json()
        setClientSystems(data)
      }
    } catch (error) {
      console.error('Error fetching client systems:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllSystems = async () => {
    try {
      const res = await fetch('/api/systems?includeItems=true')
      if (res.ok) {
        const data = await res.json()
        setAllSystems(data)
      }
    } catch (error) {
      console.error('Error fetching all systems:', error)
    }
  }

  const addSystem = async (systemId: string) => {
    setAdding(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/systems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId }),
      })
      if (res.ok) {
        await fetchClientSystems()
        setShowAddModal(false)
      }
    } catch (error) {
      console.error('Error adding system:', error)
    } finally {
      setAdding(false)
    }
  }

  const removeSystem = async (systemId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/systems?systemId=${systemId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setClientSystems(prev => prev.filter(cs => cs.system.id !== systemId))
      }
    } catch (error) {
      console.error('Error removing system:', error)
    }
  }

  // Group systems by category
  const groupedSystems = clientSystems.reduce((acc, cs) => {
    const category = cs.system.category
    if (!acc[category]) acc[category] = []
    acc[category].push(cs)
    return acc
  }, {} as Record<string, ClientSystem[]>)

  // Get systems not yet assigned to client
  const availableSystems = allSystems.filter(
    s => !clientSystems.some(cs => cs.system.id === s.id)
  )

  // Group available systems by category
  const groupedAvailable = availableSystems.reduce((acc, s) => {
    const category = s.category
    if (!acc[category]) acc[category] = []
    acc[category].push(s)
    return acc
  }, {} as Record<string, System[]>)

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Systems</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add System
        </button>
      </div>

      {clientSystems.length === 0 ? (
        <div className="text-center py-8">
          <Boxes className="w-12 h-12 text-surface-500 mx-auto mb-3" />
          <p className="text-surface-400 mb-4">No systems configured for this client</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-sm"
          >
            Add First System
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedSystems).map(([category, systems]) => (
            <div key={category}>
              <div className="text-xs text-surface-500 uppercase tracking-wide mb-2">
                {categoryLabels[category] || category}
              </div>
              <div className="space-y-2">
                {systems.map(cs => {
                  const Icon = categoryIcons[cs.system.category] || Boxes
                  const isExpanded = expandedSystem === cs.system.id
                  
                  return (
                    <div
                      key={cs.id}
                      className={cn(
                        'border rounded-lg overflow-hidden transition-all',
                        categoryColors[cs.system.category] || categoryColors.OTHER
                      )}
                    >
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5"
                        onClick={() => setExpandedSystem(isExpanded ? null : cs.system.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5" />
                          <div>
                            <span className="font-medium">{cs.system.name}</span>
                            <span className="text-xs ml-2 opacity-60">
                              {cs.system.checkItems.length} check items
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSystem(cs.system.id)
                            }}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-white/10">
                          <ul className="mt-3 space-y-2">
                            {cs.system.checkItems.map(item => (
                              <li
                                key={item.id}
                                className="flex items-start gap-2 text-sm"
                              >
                                <Check className="w-4 h-4 mt-0.5 opacity-50 flex-shrink-0" />
                                <span className={cn(item.isOptional && 'opacity-70')}>
                                  {item.text}
                                  {item.isOptional && (
                                    <span className="text-xs ml-1 opacity-50">(optional)</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add System Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add System</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-surface-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {availableSystems.length === 0 ? (
                <p className="text-surface-400 text-center py-8">
                  All available systems have been added
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedAvailable).map(([category, systems]) => (
                    <div key={category}>
                      <div className="text-xs text-surface-500 uppercase tracking-wide mb-2">
                        {categoryLabels[category] || category}
                      </div>
                      <div className="grid gap-2">
                        {systems.map(system => {
                          const Icon = categoryIcons[system.category] || Boxes
                          return (
                            <button
                              key={system.id}
                              onClick={() => addSystem(system.id)}
                              disabled={adding}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                                'hover:bg-surface-700/50',
                                categoryColors[system.category] || categoryColors.OTHER
                              )}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{system.name}</div>
                                {system.description && (
                                  <div className="text-xs opacity-60 truncate">
                                    {system.description}
                                  </div>
                                )}
                              </div>
                              <Plus className="w-4 h-4 flex-shrink-0" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



