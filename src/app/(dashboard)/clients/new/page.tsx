'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  MapPin, 
  Globe,
  Save,
  Loader2,
  User,
  Users,
  X,
} from 'lucide-react'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function NewClientPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [priority, setPriority] = useState('')
  const [defaultCadence, setDefaultCadence] = useState('MONTHLY')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [infraCheckAssigneeName, setInfraCheckAssigneeName] = useState('')
  const [notes, setNotes] = useState('')
  
  // New: User assignments by role (using user IDs) - all support multiple
  const [seAssignments, setSeAssignments] = useState<string[]>([])
  const [primaryAssignments, setPrimaryAssignments] = useState<string[]>([])
  const [secondaryAssignments, setSecondaryAssignments] = useState<string[]>([])
  const [grceAssignments, setGrceAssignments] = useState<string[]>([])
  const [itManagerAssignments, setItManagerAssignments] = useState<string[]>([])
  
  // Teams selection
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string; description: string | null; color: string | null }>>([])
  
  // For searchable user dropdowns
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string | null; email: string | null; image: string | null; role?: string }>>([])
  const [engineerSearch, setEngineerSearch] = useState('')
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false)
  
  // Track which comboboxes are open for z-index management
  const [openComboboxes, setOpenComboboxes] = useState<Set<string>>(new Set())

  // Load all users and teams on mount
  useEffect(() => {
    fetchUsers()
    fetchTeams()
  }, [])

  // Auto-set infra check assignee to first SE when SE assignments change
  useEffect(() => {
    if (seAssignments.length > 0 && !infraCheckAssigneeName) {
      const firstSe = allUsers.find(u => u.id === seAssignments[0])
      if (firstSe?.name) {
        setInfraCheckAssigneeName(firstSe.name)
        setEngineerSearch(firstSe.name)
      }
    }
  }, [seAssignments, allUsers, infraCheckAssigneeName])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        const users = (data.users || data || [])
        setAllUsers(users)
        // Also set engineers for infra check assignee dropdown
        const engineerUsers = users.filter(
          (u: any) => u.role === 'IT_ENGINEER' || u.role === 'ADMIN'
        )
      }
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const teams = await res.json()
        // Only show active teams when creating a new client
        const activeTeams = teams.filter((team: any) => team.isActive !== false)
        setAvailableTeams(activeTeams)
      }
    } catch (err) {
      console.error('Failed to load teams:', err)
    }
  }

  // Filter engineers based on search (for infra check assignee)
  const filteredEngineers = allUsers.filter(e => {
    const matchesSearch = e.name?.toLowerCase().includes(engineerSearch.toLowerCase()) ||
      e.email?.toLowerCase().includes(engineerSearch.toLowerCase())
    const isEngineer = e.role === 'IT_ENGINEER' || e.role === 'ADMIN'
    return matchesSearch && isEngineer
  })

  const handleEngineerSelect = (engineer: { id: string; name: string | null; email: string | null }) => {
    setInfraCheckAssigneeName(engineer.name || '')
    setEngineerSearch(engineer.name || '')
    setShowEngineerDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error('Client name is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          status,
          priority: priority || null,
          defaultCadence,
          websiteUrl: websiteUrl || null,
          pocEmail: pocEmail || null,
          officeAddress: officeAddress || null,
          infraCheckAssigneeName: infraCheckAssigneeName || null,
          notes: notes || null,
          // New: Send assignments
          assignments: {
            SE: seAssignments,
            PRIMARY: primaryAssignments,
            SECONDARY: secondaryAssignments,
            GRCE: grceAssignments,
            IT_MANAGER: itManagerAssignments,
          },
          // Teams
          teamIds: selectedTeams,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create client')
      }

      toast.success('Client created successfully')
      router.push(`/clients/${data.client.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-900/95 backdrop-blur-sm border-b border-surface-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/clients" className="btn-ghost p-2">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Add New Client</h1>
                <p className="text-sm text-surface-400 mt-0.5">
                  Create a new client in the database
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving || !name.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Client
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50")}>
            <h2 className="text-lg font-medium text-white">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Name */}
              <div>
                <label className="label flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Client Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter client name"
                  className="input w-full"
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="label">Status</label>
                <Combobox
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                    { value: 'ON_HOLD', label: 'On Hold' },
                    { value: 'OFFBOARDING', label: 'Offboarding' },
                    { value: 'EXITING', label: 'Exiting' },
                    { value: 'AS_NEEDED', label: 'As Needed' },
                  ]}
                  placeholder="Select status..."
                  searchable={false}
                  onOpenChange={(isOpen) => {
                    setOpenComboboxes(prev => {
                      const next = new Set(prev)
                      if (isOpen) {
                        next.add('status')
                      } else {
                        next.delete('status')
                      }
                      return next
                    })
                  }}
                />
              </div>

              {/* Priority */}
              <div>
                <label className="label">Priority</label>
                <Combobox
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: '', label: 'None' },
                    { value: 'P1', label: 'P1' },
                    { value: 'P2', label: 'P2' },
                    { value: 'P3', label: 'P3' },
                    { value: 'P4', label: 'P4' },
                  ]}
                  placeholder="Select priority..."
                  searchable={false}
                  allowClear
                  onOpenChange={(isOpen) => {
                    setOpenComboboxes(prev => {
                      const next = new Set(prev)
                      if (isOpen) {
                        next.add('priority')
                      } else {
                        next.delete('priority')
                      }
                      return next
                    })
                  }}
                />
              </div>

              {/* Default Cadence */}
              <div>
                <label className="label">Default Check Cadence</label>
                <Combobox
                  value={defaultCadence}
                  onChange={setDefaultCadence}
                  options={[
                    { value: 'WEEKLY', label: 'Weekly' },
                    { value: 'BIWEEKLY', label: 'Bi-weekly' },
                    { value: 'MONTHLY', label: 'Monthly' },
                    { value: 'BIMONTHLY', label: 'Bi-monthly' },
                    { value: 'QUARTERLY', label: 'Quarterly' },
                    { value: 'ADHOC', label: 'Ad-hoc' },
                  ]}
                  placeholder="Select cadence..."
                  searchable={false}
                  onOpenChange={(isOpen) => {
                    setOpenComboboxes(prev => {
                      const next = new Set(prev)
                      if (isOpen) {
                        next.add('cadence')
                      } else {
                        next.delete('cadence')
                      }
                      return next
                    })
                  }}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50")}>
            <h2 className="text-lg font-medium text-white">Contact Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Website URL */}
              <div>
                <label className="label flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Website URL
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="input w-full"
                />
                <p className="text-xs text-surface-500 mt-1">
                  Trust center will be automatically looked up if provided
                </p>
              </div>

              {/* POC Email */}
              <div>
                <label className="label flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  POC Email
                </label>
                <input
                  type="email"
                  value={pocEmail}
                  onChange={(e) => setPocEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="input w-full"
                />
              </div>

              {/* Office Address */}
              <div className="md:col-span-2">
                <label className="label flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Office Address
                </label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Team Assignments */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Assignments
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* System Engineer (SE) - Multiple allowed */}
              <div>
                <label className="label">System Engineer(s)</label>
                <div className="space-y-2">
                  {seAssignments.map((userId) => {
                    const user = allUsers.find(u => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        {user?.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-xs text-white">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{user?.name || 'Unknown'}</div>
                          {user?.email && (
                            <div className="text-xs text-surface-400 truncate">{user.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSeAssignments(seAssignments.filter(id => id !== userId))}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  <Combobox
                    value=""
                    onChange={(val) => {
                      if (val && !seAssignments.includes(val) && seAssignments.length < 4) {
                        setSeAssignments([...seAssignments, val])
                      }
                    }}
                    options={allUsers
                      .filter(u => !seAssignments.includes(u.id))
                      .map(u => ({
                        value: u.id,
                        label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                      }))}
                    placeholder={seAssignments.length >= 4 ? "Maximum 4 allowed" : "Add System Engineer..."}
                    allowClear={false}
                    disabled={seAssignments.length >= 4}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) next.add('se')
                        else next.delete('se')
                        return next
                      })
                    }}
                  />
                  {seAssignments.length >= 4 && (
                    <p className="text-xs text-red-400 mt-1">Maximum 4 assignments per role.</p>
                  )}
                </div>
              </div>

              {/* Primary Consultant - Multiple allowed */}
              <div>
                <label className="label">Primary Consultant(s)</label>
                <div className="space-y-2">
                  {primaryAssignments.map((userId) => {
                    const user = allUsers.find(u => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        {user?.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs text-white">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{user?.name || 'Unknown'}</div>
                          {user?.email && (
                            <div className="text-xs text-surface-400 truncate">{user.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrimaryAssignments(primaryAssignments.filter(id => id !== userId))}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  <Combobox
                    value=""
                    onChange={(val) => {
                      if (val && !primaryAssignments.includes(val) && primaryAssignments.length < 4) {
                        setPrimaryAssignments([...primaryAssignments, val])
                      }
                    }}
                    options={allUsers
                      .filter(u => !primaryAssignments.includes(u.id))
                      .map(u => ({
                        value: u.id,
                        label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                      }))}
                    placeholder={primaryAssignments.length >= 4 ? "Maximum 4 allowed" : "Add Primary Consultant..."}
                    allowClear={false}
                    disabled={primaryAssignments.length >= 4}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) next.add('primary')
                        else next.delete('primary')
                        return next
                      })
                    }}
                  />
                  {primaryAssignments.length >= 4 && (
                    <p className="text-xs text-red-400 mt-1">Maximum 4 assignments per role.</p>
                  )}
                </div>
              </div>

              {/* Secondary Consultants - Multiple allowed */}
              <div>
                <label className="label">Secondary Consultant(s)</label>
                <div className="space-y-2">
                  {secondaryAssignments.map((userId) => {
                    const user = allUsers.find(u => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        {user?.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{user?.name || 'Unknown'}</div>
                          {user?.email && (
                            <div className="text-xs text-surface-400 truncate">{user.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setSecondaryAssignments(secondaryAssignments.filter(id => id !== userId))}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  <Combobox
                    value=""
                    onChange={(val) => {
                      if (val && !secondaryAssignments.includes(val) && secondaryAssignments.length < 4) {
                        setSecondaryAssignments([...secondaryAssignments, val])
                      }
                    }}
                    options={allUsers
                      .filter(u => !secondaryAssignments.includes(u.id))
                      .map(u => ({
                        value: u.id,
                        label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                      }))}
                    placeholder={secondaryAssignments.length >= 4 ? "Maximum 4 allowed" : "Add Secondary Consultant..."}
                    allowClear={false}
                    disabled={secondaryAssignments.length >= 4}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) next.add('secondary')
                        else next.delete('secondary')
                        return next
                      })
                    }}
                  />
                  {secondaryAssignments.length >= 4 && (
                    <p className="text-xs text-red-400 mt-1">Maximum 4 assignments per role.</p>
                  )}
                </div>
              </div>

              {/* IT Manager - Multiple allowed */}
              <div>
                <label className="label">IT Manager(s)</label>
                <div className="space-y-2">
                  {itManagerAssignments.map((userId) => {
                    const user = allUsers.find(u => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        {user?.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs text-white">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{user?.name || 'Unknown'}</div>
                          {user?.email && (
                            <div className="text-xs text-surface-400 truncate">{user.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setItManagerAssignments(itManagerAssignments.filter(id => id !== userId))}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  <Combobox
                    value=""
                    onChange={(val) => {
                      if (val && !itManagerAssignments.includes(val) && itManagerAssignments.length < 4) {
                        setItManagerAssignments([...itManagerAssignments, val])
                      }
                    }}
                    options={allUsers
                      .filter(u => !itManagerAssignments.includes(u.id))
                      .map(u => ({
                        value: u.id,
                        label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                      }))}
                    placeholder={itManagerAssignments.length >= 4 ? "Maximum 4 allowed" : "Add IT Manager..."}
                    allowClear={false}
                    disabled={itManagerAssignments.length >= 4}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) next.add('itManager')
                        else next.delete('itManager')
                        return next
                      })
                    }}
                  />
                  {itManagerAssignments.length >= 4 && (
                    <p className="text-xs text-red-400 mt-1">Maximum 4 assignments per role.</p>
                  )}
                </div>
              </div>

              {/* GRCE (Compliance) - Multiple allowed */}
              <div>
                <label className="label">GRCE (Compliance)</label>
                <div className="space-y-2">
                  {grceAssignments.map((userId) => {
                    const user = allUsers.find(u => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        {user?.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs text-white">
                            {user?.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white">{user?.name || 'Unknown'}</div>
                          {user?.email && (
                            <div className="text-xs text-surface-400 truncate">{user.email}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setGrceAssignments(grceAssignments.filter(id => id !== userId))}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  <Combobox
                    value=""
                    onChange={(val) => {
                      if (val && !grceAssignments.includes(val) && grceAssignments.length < 4) {
                        setGrceAssignments([...grceAssignments, val])
                      }
                    }}
                    options={allUsers
                      .filter(u => !grceAssignments.includes(u.id))
                      .map(u => ({
                        value: u.id,
                        label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                      }))}
                    placeholder={grceAssignments.length >= 4 ? "Maximum 4 allowed" : "Add GRCE Engineer..."}
                    allowClear={false}
                    disabled={grceAssignments.length >= 4}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) next.add('grce')
                        else next.delete('grce')
                        return next
                      })
                    }}
                  />
                  {grceAssignments.length >= 4 && (
                    <p className="text-xs text-red-400 mt-1">Maximum 4 assignments per role.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Teams Selection */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teams
            </h2>
            
            <div>
              <label className="label">Assigned Teams</label>
              <div className="space-y-2">
                {selectedTeams.map((teamId) => {
                  const team = availableTeams.find(t => t.id === teamId)
                  return (
                    <div key={teamId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                      {team?.color && (
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: team.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white">{team?.name || 'Unknown Team'}</div>
                        {team?.description && (
                          <div className="text-xs text-surface-400 truncate">{team.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTeams(selectedTeams.filter(id => id !== teamId))}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
                <Combobox
                  value=""
                  onChange={(val) => {
                    if (val && !selectedTeams.includes(val)) {
                      setSelectedTeams([...selectedTeams, val])
                    }
                  }}
                  options={availableTeams
                    .filter(t => !selectedTeams.includes(t.id))
                    .map(t => ({
                      value: t.id,
                      label: t.name,
                      description: t.description || undefined,
                    }))}
                  placeholder="Add Team..."
                  allowClear={false}
                  onOpenChange={(isOpen) => {
                    setOpenComboboxes(prev => {
                      const next = new Set(prev)
                      if (isOpen) next.add('teams')
                      else next.delete('teams')
                      return next
                    })
                  }}
                />
              </div>
              <p className="text-xs text-surface-500 mt-2">
                Select teams that are assigned to this client
              </p>
            </div>
          </div>

          {/* Service Settings */}
          <div className={cn("card p-6 space-y-4", (openComboboxes.size > 0 || showEngineerDropdown) && "relative z-[100]")}>
            <h2 className="text-lg font-medium text-white">Service Settings</h2>
            
            {/* Infra Check Assignee */}
            <div className={openComboboxes.size > 0 ? "relative z-50" : ""}>
              <label className="label flex items-center gap-2">
                <User className="w-4 h-4" />
                Infra Check Assignee
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={engineerSearch}
                  onChange={(e) => {
                    setEngineerSearch(e.target.value)
                    setShowEngineerDropdown(true)
                    if (e.target.value !== infraCheckAssigneeName) {
                      setInfraCheckAssigneeName('')
                    }
                  }}
                  onFocus={() => {
                    setShowEngineerDropdown(true)
                    setOpenComboboxes(prev => new Set(prev).add('engineer'))
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowEngineerDropdown(false)
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        next.delete('engineer')
                        return next
                      })
                    }, 200)
                  }}
                  placeholder={seAssignments.length > 0 ? `Default: ${allUsers.find(u => u.id === seAssignments[0])?.name || 'First SE'} (SE)` : "Search for engineer or enter name..."}
                  className="input w-full"
                />
                {showEngineerDropdown && filteredEngineers.length > 0 && (
                  <div className="absolute z-[9999] w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredEngineers.map((engineer) => (
                      <button
                        key={engineer.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleEngineerSelect(engineer)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-700 text-sm text-surface-200 transition-colors border-b border-surface-700/50 last:border-0"
                      >
                        <div className="font-medium">{engineer.name}</div>
                        {engineer.email && (
                          <div className="text-xs text-surface-500">{engineer.email}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-surface-500 mt-1">
                {infraCheckAssigneeName 
                  ? `${infraCheckAssigneeName} will be assigned to infra checks.`
                  : seAssignments.length > 0
                    ? `Default: ${allUsers.find(u => u.id === seAssignments[0])?.name || 'First SE'} (SE) will be assigned. Select someone else to override.`
                    : "Who will be assigned to infrastructure checks for this client"}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && !showEngineerDropdown && "relative z-50")}>
            <h2 className="text-lg font-medium text-white">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this client..."
              className="input w-full min-h-[100px] resize-y"
            />
          </div>
        </form>

        {/* Info Box */}
        <div className={cn("card p-4 bg-blue-500/10 border border-blue-500/20", openComboboxes.size > 0 && "relative z-50")}>
          <p className="text-sm text-blue-400">
            <strong>Note:</strong> This client will be created in the database only. 
            If you want to sync it with Notion later, you can link it during the next sync 
            if a matching Notion page is found by name.
          </p>
        </div>
      </div>
    </div>
  )
}

