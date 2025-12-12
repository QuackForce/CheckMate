'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  MapPin, 
  Globe, 
  Hash,
  RefreshCw,
  Loader2,
  Save,
  AlertCircle,
  Users,
  Clock,
  Shield,
  X,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'

interface Client {
  id: string
  name: string
  status: string
  priority: string | null
  slackChannelId: string | null
  slackChannelName: string | null
  defaultCadence: string
  pocEmail: string | null
  officeAddress: string | null
  websiteUrl: string | null
  hoursPerMonth: string | null
  itSyncsFrequency: string | null
  onsitesFrequency: string | null
  notes: string | null
  // Engineer names from Notion
  systemEngineerName: string | null
  primaryConsultantName: string | null
  secondaryConsultantNames: string[]
  itManagerName: string | null
  grceEngineerName: string | null
  // App-specific override
  infraCheckAssigneeName: string | null
  // Compliance
  complianceFrameworks: string[]
}

interface Framework {
  id: string
  name: string
  category: string
  description: string | null
  isActive: boolean
}

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [priority, setPriority] = useState('')
  const [defaultCadence, setDefaultCadence] = useState('MONTHLY')
  const [pocEmail, setPocEmail] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [hoursPerMonth, setHoursPerMonth] = useState('')
  const [itSyncsFrequency, setItSyncsFrequency] = useState('')
  const [onsitesFrequency, setOnsitesFrequency] = useState('')
  const [notes, setNotes] = useState('')
  const [slackChannelName, setSlackChannelName] = useState('')
  // Engineer names (from Notion)
  const [systemEngineerName, setSystemEngineerName] = useState('')
  const [primaryConsultantName, setPrimaryConsultantName] = useState('')
  const [secondaryConsultantNames, setSecondaryConsultantNames] = useState('')
  const [itManagerName, setItManagerName] = useState('')
  const [grceEngineerName, setGrceEngineerName] = useState('')
  // App-specific override for infra check assignee
  const [infraCheckAssigneeName, setInfraCheckAssigneeName] = useState('')
  const [originalInfraCheckAssigneeName, setOriginalInfraCheckAssigneeName] = useState('')
  
  // For searchable user dropdown
  const [engineers, setEngineers] = useState<Array<{ id: string; name: string | null; email: string | null }>>([])
  const [engineerSearch, setEngineerSearch] = useState('')
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false)
  
  // For compliance frameworks
  const [availableFrameworks, setAvailableFrameworks] = useState<Framework[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [frameworkSearch, setFrameworkSearch] = useState('')
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false)
  
  // Track which comboboxes are open for z-index management
  const [openComboboxes, setOpenComboboxes] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchClient()
    fetchEngineers()
    fetchFrameworks()
  }, [clientId])
  
  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/frameworks')
      if (res.ok) {
        const data = await res.json()
        setAvailableFrameworks(data)
      }
    } catch (err) {
      console.error('Failed to load frameworks:', err)
    }
  }
  
  const fetchEngineers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        // Filter to only show engineers and admins
        const engineerUsers = (data.users || data || []).filter(
          (u: any) => u.role === 'IT_ENGINEER' || u.role === 'ADMIN'
        )
        setEngineers(engineerUsers)
      }
    } catch (err) {
      console.error('Failed to load engineers:', err)
    }
  }
  
  // Filter engineers based on search
  const filteredEngineers = engineers.filter(e =>
    e.name?.toLowerCase().includes(engineerSearch.toLowerCase()) ||
    e.email?.toLowerCase().includes(engineerSearch.toLowerCase())
  )
  
  const handleEngineerSelect = (engineer: { id: string; name: string | null; email: string | null }) => {
    setInfraCheckAssigneeName(engineer.name || '')
    setEngineerSearch(engineer.name || '')
    setShowEngineerDropdown(false)
  }

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`)
      if (!res.ok) throw new Error('Failed to load client')
      const client: Client = await res.json()
      
      setName(client.name)
      setStatus(client.status)
      setPriority(client.priority || '')
      setDefaultCadence(client.defaultCadence)
      setPocEmail(client.pocEmail || '')
      setOfficeAddress(client.officeAddress || '')
      setWebsiteUrl(client.websiteUrl || '')
      setHoursPerMonth(client.hoursPerMonth || '')
      setItSyncsFrequency(client.itSyncsFrequency || '')
      setOnsitesFrequency(client.onsitesFrequency || '')
      setNotes(client.notes || '')
      setSlackChannelName(client.slackChannelName || '')
      setSystemEngineerName(client.systemEngineerName || '')
      setPrimaryConsultantName(client.primaryConsultantName || '')
      // Secondary consultants is an array, join with comma for editing
      setSecondaryConsultantNames(client.secondaryConsultantNames?.join(', ') || '')
      setItManagerName(client.itManagerName || '')
      setGrceEngineerName(client.grceEngineerName || '')
      setInfraCheckAssigneeName(client.infraCheckAssigneeName || '')
      setOriginalInfraCheckAssigneeName(client.infraCheckAssigneeName || '')
      setEngineerSearch(client.infraCheckAssigneeName || '')
      setSelectedFrameworks(client.complianceFrameworks || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Normalize URL - add https:// if missing, handle domain-only input
  const normalizeUrl = (url: string): string | null => {
    if (!url || !url.trim()) return null
    const trimmed = url.trim()
    // If it already has a protocol, return as-is
    if (trimmed.match(/^https?:\/\//i)) return trimmed
    // Otherwise, add https://
    return `https://${trimmed}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          status,
          priority: priority || null,
          defaultCadence,
          pocEmail: pocEmail || null,
          officeAddress: officeAddress || null,
          websiteUrl: normalizeUrl(websiteUrl),
          hoursPerMonth: hoursPerMonth || null,
          itSyncsFrequency: itSyncsFrequency || null,
          onsitesFrequency: onsitesFrequency || null,
          notes: notes || null,
          slackChannelName: slackChannelName || null,
          systemEngineerName: systemEngineerName || null,
          primaryConsultantName: primaryConsultantName || null,
          // Split comma-separated names back into array
          secondaryConsultantNames: secondaryConsultantNames 
            ? secondaryConsultantNames.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          itManagerName: itManagerName || null,
          grceEngineerName: grceEngineerName || null,
          infraCheckAssigneeName: infraCheckAssigneeName || null,
          _oldInfraCheckAssigneeName: originalInfraCheckAssigneeName, // Pass old value for comparison
          complianceFrameworks: selectedFrameworks,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update client')
      }

      toast.success('Client updated successfully!')
      router.push(`/clients/${clientId}`)
      router.refresh() // Refresh server component data
    } catch (err: any) {
      setError(err.message)
      toast.error('Failed to update client', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-surface-400">Loading client...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-900/95 backdrop-blur-sm border-b border-surface-800">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href={`/clients/${clientId}`}
              className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-surface-400" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white">Edit Client</h1>
              <p className="text-sm text-surface-400">{name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50")}>
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" />
              Basic Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                />
              </div>

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

              <div>
                <label className="label">Website URL</label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="input"
                  placeholder="example.com or https://example.com"
                />
                <p className="text-xs text-surface-500 mt-1">
                  Domain only is fine (e.g., bland.ai)
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-brand-400" />
              Contact Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">POC Email</label>
                <input
                  type="text"
                  value={pocEmail}
                  onChange={(e) => setPocEmail(e.target.value)}
                  className="input"
                  placeholder="email@company.com"
                />
              </div>

              <div>
                <label className="label">Slack Channel</label>
                <input
                  type="text"
                  value={slackChannelName}
                  onChange={(e) => setSlackChannelName(e.target.value)}
                  className="input"
                  placeholder="#client-channel"
                />
              </div>

              <div className="col-span-2">
                <label className="label">Office Address</label>
                <input
                  type="text"
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  className="input"
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>
          </div>

          {/* Team Assignments */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-400" />
              Team Assignments
            </h2>
            <p className="text-sm text-surface-500">
              Team members are synced from Notion. You can override the infra check assignee here.
            </p>

            {/* Infra Check Assignee Override - Highlighted */}
            <div className="col-span-2 p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg">
              <label className="label text-brand-400">
                Infra Check Assignee
              </label>
              <div className="mt-2 space-y-2">
                {/* Searchable dropdown */}
                <div className="relative">
                  <input
                    type="text"
                    value={engineerSearch || infraCheckAssigneeName}
                    onChange={(e) => {
                      setEngineerSearch(e.target.value)
                      setInfraCheckAssigneeName(e.target.value)
                      setShowEngineerDropdown(true)
                    }}
                    onFocus={() => setShowEngineerDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowEngineerDropdown(false), 200)
                    }}
                    placeholder={systemEngineerName ? `Default: ${systemEngineerName} (SE)` : "Type to search users or enter name..."}
                    className="input w-full"
                  />
                  {showEngineerDropdown && (
                    <div 
                      className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {filteredEngineers.length > 0 ? (
                        filteredEngineers.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handleEngineerSelect(e)}
                            className="w-full text-left px-4 py-2.5 hover:bg-surface-700 text-sm text-surface-200 transition-colors border-b border-surface-700/50 last:border-0"
                          >
                            <div className="font-medium">{e.name}</div>
                            {e.email && (
                              <div className="text-xs text-surface-500">{e.email}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2.5 text-sm text-surface-500">
                          {engineerSearch ? 'No engineers found' : 'Type to search engineers...'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Team member quick select */}
                <div className="flex flex-wrap gap-2">
                  {systemEngineerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setInfraCheckAssigneeName(systemEngineerName)
                        setEngineerSearch(systemEngineerName)
                      }}
                      className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
                    >
                      {systemEngineerName} (SE) ✓
                    </button>
                  )}
                  {primaryConsultantName && (
                    <button
                      type="button"
                      onClick={() => {
                        setInfraCheckAssigneeName(primaryConsultantName)
                        setEngineerSearch(primaryConsultantName)
                      }}
                      className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
                    >
                      {primaryConsultantName} (Primary)
                    </button>
                  )}
                  {secondaryConsultantNames && secondaryConsultantNames.split(',').map(name => name.trim()).filter(Boolean).map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setInfraCheckAssigneeName(name)
                        setEngineerSearch(name)
                      }}
                      className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
                    >
                      {name} (Secondary)
                    </button>
                  ))}
                  {itManagerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setInfraCheckAssigneeName(itManagerName)
                        setEngineerSearch(itManagerName)
                      }}
                      className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
                    >
                      {itManagerName} (IT Manager)
                    </button>
                  )}
                  {grceEngineerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setInfraCheckAssigneeName(grceEngineerName)
                        setEngineerSearch(grceEngineerName)
                      }}
                      className="text-xs px-2 py-1 bg-surface-700 hover:bg-surface-600 text-surface-300 rounded"
                    >
                      {grceEngineerName} (GRCE)
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-surface-500 mt-2">
                {infraCheckAssigneeName 
                  ? `Override active: ${infraCheckAssigneeName} will be assigned to infra checks.`
                  : systemEngineerName 
                    ? `Default: ${systemEngineerName} (SE) will be assigned to infra checks. Select someone else to override.`
                    : "No SE assigned. Select someone to assign infra checks."}
              </p>
              {infraCheckAssigneeName && (
                <button
                  type="button"
                  onClick={() => {
                    setInfraCheckAssigneeName('')
                    setEngineerSearch('')
                  }}
                  className="text-xs text-brand-400 hover:text-brand-300 mt-2"
                >
                  ← Reset to default (SE)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* SE from Notion - Read-only display */}
              <div>
                <label className="label text-surface-500">System Engineer (SE)</label>
                <div className="input bg-surface-800/50 text-surface-400 cursor-not-allowed">
                  {systemEngineerName || <span className="text-surface-600">Not assigned in Notion</span>}
                </div>
                <p className="text-xs text-surface-600 mt-1">Synced from Notion</p>
              </div>

              <div>
                <label className="label">Primary Consultant</label>
                <input
                  type="text"
                  value={primaryConsultantName}
                  onChange={(e) => setPrimaryConsultantName(e.target.value)}
                  className="input"
                  placeholder="Consultant name..."
                />
              </div>

              <div>
                <label className="label">Secondary Consultant(s)</label>
                <input
                  type="text"
                  value={secondaryConsultantNames}
                  onChange={(e) => setSecondaryConsultantNames(e.target.value)}
                  className="input"
                  placeholder="Name 1, Name 2, ..."
                />
                <p className="text-xs text-surface-500 mt-1">
                  Separate multiple names with commas
                </p>
              </div>

              <div>
                <label className="label">IT Manager</label>
                <input
                  type="text"
                  value={itManagerName}
                  onChange={(e) => setItManagerName(e.target.value)}
                  className="input"
                  placeholder="Manager name..."
                />
              </div>

              <div>
                <label className="label">GRCE (Compliance)</label>
                <input
                  type="text"
                  value={grceEngineerName}
                  onChange={(e) => setGrceEngineerName(e.target.value)}
                  className="input"
                  placeholder="GRCE name..."
                />
              </div>
            </div>
          </div>

          {/* Service Settings */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50")}>
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-400" />
              Service Settings
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Default Check Cadence
                </label>
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

              <div>
                <label className="label">Hours Per Month</label>
                <input
                  type="text"
                  value={hoursPerMonth}
                  onChange={(e) => setHoursPerMonth(e.target.value)}
                  className="input"
                  placeholder="e.g., 10"
                />
              </div>

              <div>
                <label className="label">IT Syncs Frequency</label>
                <input
                  type="text"
                  value={itSyncsFrequency}
                  onChange={(e) => setItSyncsFrequency(e.target.value)}
                  className="input"
                  placeholder="e.g., Weekly"
                />
              </div>

              <div>
                <label className="label">Onsites Frequency</label>
                <input
                  type="text"
                  value={onsitesFrequency}
                  onChange={(e) => setOnsitesFrequency(e.target.value)}
                  className="input"
                  placeholder="e.g., Monthly, Adhoc"
                />
              </div>
            </div>
          </div>

          {/* Compliance Frameworks */}
          <div className={cn("card p-6 space-y-4", showFrameworkDropdown && "relative z-50")}>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-medium text-white">Compliance Frameworks</h2>
            </div>
            
            {/* Selected frameworks */}
            {selectedFrameworks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFrameworks.map(framework => (
                  <span 
                    key={framework}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  >
                    {framework}
                    <button
                      type="button"
                      onClick={() => setSelectedFrameworks(prev => prev.filter(f => f !== framework))}
                      className="hover:text-blue-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Framework picker */}
            <div className="relative">
              <input
                type="text"
                value={frameworkSearch}
                onChange={(e) => {
                  setFrameworkSearch(e.target.value)
                  setShowFrameworkDropdown(true)
                }}
                onFocus={() => setShowFrameworkDropdown(true)}
                className="input w-full"
                placeholder="Search and add frameworks..."
              />
              
              {showFrameworkDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {availableFrameworks
                    .filter(f => 
                      f.isActive && 
                      !selectedFrameworks.includes(f.name) &&
                      (frameworkSearch === '' || f.name.toLowerCase().includes(frameworkSearch.toLowerCase()))
                    )
                    .map(framework => (
                      <button
                        key={framework.id}
                        type="button"
                        onClick={() => {
                          setSelectedFrameworks(prev => [...prev, framework.name])
                          setFrameworkSearch('')
                          setShowFrameworkDropdown(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-surface-700 flex items-center justify-between group"
                      >
                        <div>
                          <span className="text-white">{framework.name}</span>
                          {framework.description && (
                            <p className="text-xs text-surface-400 truncate max-w-md">
                              {framework.description}
                            </p>
                          )}
                        </div>
                        <Check className="w-4 h-4 text-green-400 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))
                  }
                  {availableFrameworks.filter(f => 
                    f.isActive && 
                    !selectedFrameworks.includes(f.name) &&
                    (frameworkSearch === '' || f.name.toLowerCase().includes(frameworkSearch.toLowerCase()))
                  ).length === 0 && (
                    <div className="px-4 py-3 text-surface-400 text-sm">
                      {frameworkSearch ? 'No matching frameworks' : 'No more frameworks available'}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Click outside to close */}
            {showFrameworkDropdown && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowFrameworkDropdown(false)}
              />
            )}
            
            <p className="text-xs text-surface-500">
              Select compliance frameworks this client needs to maintain. Manage available frameworks in Settings.
            </p>
          </div>

          {/* Notes */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-medium text-white">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[120px]"
              placeholder="Any additional notes about this client..."
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Link href={`/clients/${clientId}`} className="btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
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
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

