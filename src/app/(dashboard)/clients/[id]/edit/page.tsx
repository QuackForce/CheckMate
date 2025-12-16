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
  ChevronDown,
  Plus,
  Link2,
  Laptop,
  Key,
  ClipboardCheck,
  GraduationCap,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Combobox } from '@/components/ui/combobox'
import { toast } from 'sonner'

// Use string literals for roles (Prisma enum may not be exported)
const ClientEngineerRole = {
  SE: 'SE',
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  GRCE: 'GRCE',
  IT_MANAGER: 'IT_MANAGER',
} as const

type ClientEngineerRoleType = typeof ClientEngineerRole[keyof typeof ClientEngineerRole]

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
  // Engineer names from Notion (deprecated, kept for backward compatibility)
  systemEngineerName: string | null
  primaryConsultantName: string | null
  secondaryConsultantNames: string[]
  itManagerName: string | null
  grceEngineerName: string | null
  // App-specific override
  infraCheckAssigneeName: string | null
  // Compliance
  complianceFrameworks: string[]
  // New: assignments from ClientEngineerAssignment table
  assignments?: Array<{
    id: string
    userId: string
    role: ClientEngineerRoleType
    user: {
      id: string
      name: string | null
      email: string | null
      image: string | null
    }
  }>
  // Teams from ClientTeam join table
  teamAssignments?: Array<{
    id: string
    teamId: string
    team: {
      id: string
      name: string
      description: string | null
      color: string | null
    }
  }>
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
  // Engineer names (from Notion) - kept for backward compatibility and display
  const [systemEngineerName, setSystemEngineerName] = useState('')
  const [primaryConsultantName, setPrimaryConsultantName] = useState('')
  const [secondaryConsultantNames, setSecondaryConsultantNames] = useState('')
  const [itManagerName, setItManagerName] = useState('')
  const [grceEngineerName, setGrceEngineerName] = useState('')
  // App-specific override for infra check assignee
  const [infraCheckAssigneeName, setInfraCheckAssigneeName] = useState('')
  const [originalInfraCheckAssigneeName, setOriginalInfraCheckAssigneeName] = useState('')
  
  // New: User assignments by role (using user IDs) - all support multiple now
  const [seAssignments, setSeAssignments] = useState<string[]>([]) // Multiple SEs allowed
  const [primaryAssignments, setPrimaryAssignments] = useState<string[]>([]) // Multiple PRIMARYs allowed
  const [secondaryAssignments, setSecondaryAssignments] = useState<string[]>([]) // Multiple SECONDARYs allowed
  const [grceAssignments, setGrceAssignments] = useState<string[]>([]) // Multiple GRCEs allowed
  const [itManagerAssignments, setItManagerAssignments] = useState<string[]>([]) // Multiple IT_MANAGERs allowed
  
  // For searchable user dropdowns
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string | null; email: string | null; image: string | null }>>([])
  // Store users from assignments (for non-admin users who can't fetch all users)
  const [assignmentUsers, setAssignmentUsers] = useState<Map<string, { id: string; name: string | null; email: string | null; image: string | null }>>(new Map())
  const [engineerSearch, setEngineerSearch] = useState('')
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false)
  
  // For compliance frameworks
  const [availableFrameworks, setAvailableFrameworks] = useState<Framework[]>([])
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([])
  const [frameworkSearch, setFrameworkSearch] = useState('')
  const [showFrameworkDropdown, setShowFrameworkDropdown] = useState(false)
  
  // Teams selection
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string; description: string | null; color: string | null }>>([])
  
  // Integration URLs
  const [itGlueUrl, setItGlueUrl] = useState('')
  const [zendeskUrl, setZendeskUrl] = useState('')
  const [trelloUrl, setTrelloUrl] = useState('')
  const [onePasswordUrl, setOnePasswordUrl] = useState('')
  const [sharedDriveUrl, setSharedDriveUrl] = useState('')
  
  // Custom URLs: Array of { label: string, url: string }
  const [customUrls, setCustomUrls] = useState<Array<{ label: string; url: string }>>([])
  const [newCustomUrlLabel, setNewCustomUrlLabel] = useState('')
  const [newCustomUrl, setNewCustomUrl] = useState('')
  
  // Trust Center
  const [trustCenterUrl, setTrustCenterUrl] = useState('')
  const [trustCenterPlatform, setTrustCenterPlatform] = useState('')
  const [syncingTrustCenter, setSyncingTrustCenter] = useState(false)
  
  // Systems
  const [clientSystems, setClientSystems] = useState<Array<{ id: string; system: { id: string; name: string; category: string } }>>([])
  const [allSystems, setAllSystems] = useState<Array<{ id: string; name: string; category: string }>>([])
  const [addingSystem, setAddingSystem] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['basicInfo'])) // Basic Info open by default
  
  // Track which comboboxes are open for z-index management
  const [openComboboxes, setOpenComboboxes] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchClient()
    fetchEngineers()
    fetchFrameworks()
    fetchTeams()
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
        // Get all users for assignment selection
        const users = (data.users || data || [])
        setAllUsers(users)
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
        // Only show active teams when selecting teams for a client
        const activeTeams = teams.filter((team: any) => team.isActive !== false)
        setAvailableTeams(activeTeams)
      }
    } catch (err) {
      console.error('Failed to load teams:', err)
    }
  }
  
  // Filter users based on search (for infra check assignee)
  const filteredEngineers = allUsers.filter(e =>
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
      
      // Load assignments from ClientEngineerAssignment table
      // Filter out orphaned assignments (where user is null)
      if (client.assignments) {
        const validAssignments = client.assignments.filter((a: any) => a.user !== null)
        
        // Store users from assignments for display (works even if allUsers is empty for non-admins)
        const usersMap = new Map<string, { id: string; name: string | null; email: string | null; image: string | null }>()
        validAssignments.forEach((a: any) => {
          if (a.user) {
            usersMap.set(a.userId, {
              id: a.user.id,
              name: a.user.name,
              email: a.user.email,
              image: a.user.image,
            })
          }
        })
        setAssignmentUsers(usersMap)
        
        const seUsers = validAssignments
          .filter(a => a.role === 'SE')
          .map(a => a.userId)
        const primaryUsers = validAssignments
          .filter(a => a.role === 'PRIMARY')
          .map(a => a.userId)
        const secondaryUsers = validAssignments
          .filter(a => a.role === 'SECONDARY')
          .map(a => a.userId)
        const grceUsers = validAssignments
          .filter(a => a.role === 'GRCE')
          .map(a => a.userId)
        const itManagerUsers = validAssignments
          .filter(a => a.role === 'IT_MANAGER')
          .map(a => a.userId)
        
        setSeAssignments(seUsers)
        setPrimaryAssignments(primaryUsers)
        setSecondaryAssignments(secondaryUsers)
        setGrceAssignments(grceUsers)
        setItManagerAssignments(itManagerUsers)
      }
      
      // Keep name fields for backward compatibility and display
      setSystemEngineerName(client.systemEngineerName || '')
      setPrimaryConsultantName(client.primaryConsultantName || '')
      setSecondaryConsultantNames(client.secondaryConsultantNames?.join(', ') || '')
      setItManagerName(client.itManagerName || '')
      setGrceEngineerName(client.grceEngineerName || '')
      setInfraCheckAssigneeName(client.infraCheckAssigneeName || '')
      setOriginalInfraCheckAssigneeName(client.infraCheckAssigneeName || '')
      setEngineerSearch(client.infraCheckAssigneeName || '')
      setSelectedFrameworks(client.complianceFrameworks || [])
      
      // Load teams from ClientTeam join table
      if (client.teamAssignments) {
        const teamIds = client.teamAssignments.map(ta => ta.teamId)
        setSelectedTeams(teamIds)
      }
      
      // Load integration URLs and Trust Center
      setItGlueUrl((client as any).itGlueUrl || '')
      setZendeskUrl((client as any).zendeskUrl || '')
      setTrelloUrl((client as any).trelloUrl || '')
      setOnePasswordUrl((client as any).onePasswordUrl || '')
      setSharedDriveUrl((client as any).sharedDriveUrl || '')
      setTrustCenterUrl((client as any).trustCenterUrl || '')
      
      // Load custom URLs
      const customUrlsData = (client as any).customUrls
      if (customUrlsData && Array.isArray(customUrlsData)) {
        setCustomUrls(customUrlsData)
      } else {
        setCustomUrls([])
      }
      setTrustCenterPlatform((client as any).trustCenterPlatform || '')
      
      // Load systems from client response if available, otherwise fetch
      if ((client as any).clientSystems) {
        setClientSystems((client as any).clientSystems.map((cs: any) => ({
          id: cs.id,
          system: {
            id: cs.system.id,
            name: cs.system.name,
            category: cs.system.category,
          },
        })))
      } else {
        fetchClientSystems()
      }
      fetchAllSystems()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchClientSystems = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/systems`)
      if (res.ok) {
        const data = await res.json()
        setClientSystems(data)
      }
    } catch (err) {
      console.error('Failed to load client systems:', err)
    }
  }
  
  const fetchAllSystems = async () => {
    try {
      const res = await fetch('/api/systems?includeItems=true')
      if (res.ok) {
        const data = await res.json()
        setAllSystems(data)
      }
    } catch (err) {
      console.error('Failed to load systems:', err)
    }
  }
  
  const handleAddSystem = async (systemId: string) => {
    setAddingSystem(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/systems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId }),
      })
      if (res.ok) {
        await fetchClientSystems()
        toast.success('System added')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to add system')
      }
    } catch (err) {
      toast.error('Failed to add system')
    } finally {
      setAddingSystem(false)
    }
  }
  
  const handleRemoveSystem = async (clientSystemId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/systems`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSystemId }),
      })
      if (res.ok) {
        await fetchClientSystems()
        toast.success('System removed')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to remove system')
      }
    } catch (err) {
      toast.error('Failed to remove system')
    }
  }
  
  const toggleSection = (section: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }
  
  const handleSyncTrustCenter = async () => {
    setSyncingTrustCenter(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/trust-center`, {
        method: 'POST',
      })
      
      if (res.ok) {
        const data = await res.json()
        setTrustCenterUrl(data.trustCenterUrl || '')
        setTrustCenterPlatform(data.platform || '')
        toast.success('Trust center synced successfully', {
          description: `Matched by ${data.matchedBy === 'website' ? 'website URL' : 'company name'}`,
        })
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to sync trust center', {
          description: 'Trust center not found in TrustLists database. You can enter it manually.',
        })
      }
    } catch (err: any) {
      toast.error('Failed to sync trust center', { description: err.message })
    } finally {
      setSyncingTrustCenter(false)
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
          // New: Send assignments instead of names
          assignments: {
            SE: seAssignments,
            PRIMARY: primaryAssignments,
            SECONDARY: secondaryAssignments,
            GRCE: grceAssignments,
            IT_MANAGER: itManagerAssignments,
          },
          // Keep name fields for backward compatibility (will be derived from assignments)
          systemEngineerName: systemEngineerName || null,
          primaryConsultantName: primaryConsultantName || null,
          secondaryConsultantNames: secondaryConsultantNames 
            ? secondaryConsultantNames.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          itManagerName: itManagerName || null,
          grceEngineerName: grceEngineerName || null,
          infraCheckAssigneeName: infraCheckAssigneeName || null,
          _oldInfraCheckAssigneeName: originalInfraCheckAssigneeName,
          complianceFrameworks: selectedFrameworks,
          // Teams
          teamIds: selectedTeams,
          // Integration URLs
          itGlueUrl: normalizeUrl(itGlueUrl),
          zendeskUrl: normalizeUrl(zendeskUrl),
          trelloUrl: normalizeUrl(trelloUrl),
          onePasswordUrl: normalizeUrl(onePasswordUrl),
          sharedDriveUrl: normalizeUrl(sharedDriveUrl),
          customUrls: customUrls.length > 0 ? customUrls : null,
          // Trust Center
          trustCenterUrl: normalizeUrl(trustCenterUrl),
          trustCenterPlatform: trustCenterPlatform || null,
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
      <div className="sticky top-0 z-10 bg-surface-950/80 backdrop-blur-xl">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href={`/clients/${clientId}`}
              className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-surface-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Client</h1>
              <p className="text-sm text-surface-400 mt-0.5">{name}</p>
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
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
            <button
              type="button"
              onClick={() => toggleSection('basicInfo')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-400" />
                Basic Information
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('basicInfo') && 'rotate-180'
              )} />
            </button>

            {openSections.has('basicInfo') && (
              <div className="grid grid-cols-2 gap-4 pt-4">
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
            )}
          </div>

          {/* Contact Information */}
          <div className="card p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('contact')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-brand-400" />
                Contact Information
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('contact') && 'rotate-180'
              )} />
            </button>

            {openSections.has('contact') && (
              <div className="grid grid-cols-2 gap-4 pt-4">
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
            )}
          </div>

          {/* User Assignments */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
            <button
              type="button"
              onClick={() => toggleSection('assignments')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-400" />
                User Assignments
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('assignments') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('assignments') && (
              <div className="pt-4 space-y-4">
                <p className="text-sm text-surface-500">
                  Assign users to specific roles for this client. You can override the infra check assignee here.
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
                      className="absolute z-[100] w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
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
              {/* System Engineer (SE) - Multiple allowed */}
              <div>
                <label className="label">System Engineer (SE)</label>
                <div className="space-y-2">
                  {seAssignments.map((userId) => {
                    // Use assignmentUsers first (works for non-admins), fallback to allUsers
                    const user = assignmentUsers.get(userId) || allUsers.find(u => u.id === userId)
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
                    <p className="text-xs text-surface-500 mt-1">Maximum 4 System Engineers allowed</p>
                  )}
                </div>
              </div>

              {/* Primary Consultant - Multiple allowed */}
              <div>
                <label className="label">Primary Consultant</label>
                <div className="space-y-2">
                  {primaryAssignments.map((userId) => {
                    // Use assignmentUsers first (works for non-admins), fallback to allUsers
                    const user = assignmentUsers.get(userId) || allUsers.find(u => u.id === userId)
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
                    <p className="text-xs text-surface-500 mt-1">Maximum 4 Primary Consultants allowed</p>
                  )}
                </div>
              </div>

              {/* Secondary Consultants - Multiple allowed */}
              <div>
                <label className="label">Secondary Consultant(s)</label>
                <div className="space-y-2">
                  {secondaryAssignments.map((userId) => {
                    // Use assignmentUsers first (works for non-admins), fallback to allUsers
                    const user = assignmentUsers.get(userId) || allUsers.find(u => u.id === userId)
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
                    <p className="text-xs text-surface-500 mt-1">Maximum 4 Secondary Consultants allowed</p>
                  )}
                </div>
              </div>

              {/* IT Manager - Multiple allowed */}
              <div>
                <label className="label">IT Manager</label>
                <div className="space-y-2">
                  {itManagerAssignments.map((userId) => {
                    // Use assignmentUsers first (works for non-admins), fallback to allUsers
                    const user = assignmentUsers.get(userId) || allUsers.find(u => u.id === userId)
                    return (
                      <div key={userId} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        {user?.image ? (
                          <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs text-white">
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
                      if (val && !itManagerAssignments.includes(val)) {
                        setItManagerAssignments([...itManagerAssignments, val])
                      }
                    }}
                    options={allUsers
                      .filter(u => !itManagerAssignments.includes(u.id))
                      .map(u => ({
                        value: u.id,
                        label: `${u.name || 'Unknown'}${u.email ? ` (${u.email})` : ''}`,
                      }))}
                    placeholder="Add IT Manager..."
                    allowClear={false}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) next.add('itManager')
                        else next.delete('itManager')
                        return next
                      })
                    }}
                  />
                </div>
              </div>

              {/* GRCE (Compliance) - Multiple allowed */}
              <div>
                <label className="label">GRCE (Compliance)</label>
                <div className="space-y-2">
                  {grceAssignments.map((userId) => {
                    // Use assignmentUsers first (works for non-admins), fallback to allUsers
                    const user = assignmentUsers.get(userId) || allUsers.find(u => u.id === userId)
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
                    <p className="text-xs text-surface-500 mt-1">Maximum 4 GRCE Engineers allowed</p>
                  )}
                </div>
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Teams Selection */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
            <button
              type="button"
              onClick={() => toggleSection('teams')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('teams') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('teams') && (
              <div className="pt-4">
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
            )}
          </div>

          {/* Service Settings */}
          <div className={cn("card p-6 space-y-4", openComboboxes.size > 0 && "relative z-50 overflow-visible")}>
            <button
              type="button"
              onClick={() => toggleSection('service')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-400" />
                Service Settings
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('service') && 'rotate-180'
              )} />
            </button>

            {openSections.has('service') && (
              <div className="grid grid-cols-2 gap-4 pt-4">
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
            )}
          </div>

          {/* Compliance Frameworks */}
          <div className={cn("card p-6 space-y-4", showFrameworkDropdown && "relative z-50 overflow-visible")}>
            <button
              type="button"
              onClick={() => toggleSection('frameworks')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-medium text-white">Compliance Frameworks</h2>
              </div>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('frameworks') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('frameworks') && (
              <div className="pt-4">
            
            {/* Selected frameworks */}
            {selectedFrameworks.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
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
                <div className="absolute z-[100] w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
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
            )}
          </div>

          {/* Systems */}
          <div className="card p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('systems')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-brand-400" />
                Systems
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('systems') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('systems') && (
              <div className="space-y-4 pt-4">
                {/* Current Systems */}
                {clientSystems.length > 0 && (
                  <div className="space-y-2">
                    <label className="label">Current Systems</label>
                    <div className="space-y-2">
                      {clientSystems.map((cs) => {
                        const isGRC = cs.system.category === 'GRC'
                        const isSecurityTraining = cs.system.category === 'SECURITY_TRAINING'
                        return (
                          <div key={cs.id} className="flex items-center justify-between p-3 bg-surface-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              {isGRC && <ClipboardCheck className="w-4 h-4 text-emerald-400" />}
                              {isSecurityTraining && <GraduationCap className="w-4 h-4 text-violet-400" />}
                              {!isGRC && !isSecurityTraining && <Laptop className="w-4 h-4 text-surface-400" />}
                              <span className="text-white">{cs.system.name}</span>
                              <span className="text-xs text-surface-500">({cs.system.category})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSystem(cs.id)}
                              className="p-1 text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Add System */}
                <div>
                  <label className="label">Add System</label>
                  <Combobox
                    value=""
                    onChange={(val) => {
                      if (val) {
                        handleAddSystem(val)
                      }
                    }}
                    options={allSystems
                      .filter(s => !clientSystems.some(cs => cs.system.id === s.id))
                      .map(s => ({
                        value: s.id,
                        label: `${s.name} (${s.category})`,
                      }))}
                    placeholder="Select a system to add..."
                    disabled={addingSystem}
                    onOpenChange={(isOpen) => {
                      setOpenComboboxes(prev => {
                        const next = new Set(prev)
                        if (isOpen) {
                          next.add('addSystem')
                        } else {
                          next.delete('addSystem')
                        }
                        return next
                      })
                    }}
                  />
                </div>
                
                <p className="text-xs text-surface-500">
                  Add systems this client uses. GRC Platform and Security Training systems will appear in the Compliance section.
                </p>
              </div>
            )}
          </div>

          {/* Integration URLs */}
          <div className="card p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('integrations')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-400" />
                Integration URLs
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('integrations') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('integrations') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="label">IT Glue URL</label>
                    <input
                      type="url"
                      value={itGlueUrl}
                      onChange={(e) => setItGlueUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="label">Zendesk URL</label>
                    <input
                      type="url"
                      value={zendeskUrl}
                      onChange={(e) => setZendeskUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="label">Trello URL</label>
                    <input
                      type="url"
                      value={trelloUrl}
                      onChange={(e) => setTrelloUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="label">1Password URL</label>
                    <input
                      type="url"
                      value={onePasswordUrl}
                      onChange={(e) => setOnePasswordUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="label">Shared Drive URL</label>
                    <input
                      type="url"
                      value={sharedDriveUrl}
                      onChange={(e) => setSharedDriveUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                {/* Custom URLs */}
                <div className="mt-6 pt-6 border-t border-surface-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-surface-300">Custom URLs</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (newCustomUrlLabel.trim() && newCustomUrl.trim()) {
                        // Normalize URL
                        let url = newCustomUrl.trim()
                        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                          url = `https://${url}`
                        }
                        setCustomUrls([...customUrls, { label: newCustomUrlLabel.trim(), url }])
                        setNewCustomUrlLabel('')
                        setNewCustomUrl('')
                      }
                    }}
                    disabled={!newCustomUrlLabel.trim() || !newCustomUrl.trim()}
                    className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                
                {/* Add new custom URL */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input
                    type="text"
                    value={newCustomUrlLabel}
                    onChange={(e) => setNewCustomUrlLabel(e.target.value)}
                    className="input"
                    placeholder="Label (e.g., Jira, Confluence)"
                  />
                  <input
                    type="url"
                    value={newCustomUrl}
                    onChange={(e) => setNewCustomUrl(e.target.value)}
                    className="input"
                    placeholder="https://..."
                  />
                </div>
                
                {/* Existing custom URLs */}
                {customUrls.length > 0 && (
                  <div className="space-y-2">
                    {customUrls.map((customUrl, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-surface-800 rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={customUrl.label}
                            onChange={(e) => {
                              const updated = [...customUrls]
                              updated[index].label = e.target.value
                              setCustomUrls(updated)
                            }}
                            className="input text-sm"
                            placeholder="Label"
                          />
                          <input
                            type="url"
                            value={customUrl.url}
                            onChange={(e) => {
                              const updated = [...customUrls]
                              updated[index].url = e.target.value
                              setCustomUrls(updated)
                            }}
                            className="input text-sm"
                            placeholder="https://..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomUrls(customUrls.filter((_, i) => i !== index))
                          }}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </>
            )}
          </div>

          {/* Trust Center */}
          <div className="card p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('trustCenter')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Trust Center
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('trustCenter') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('trustCenter') && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-surface-400">
                    Sync from TrustLists API using client's website URL or name
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncTrustCenter}
                    disabled={syncingTrustCenter}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    {syncingTrustCenter ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sync from TrustLists
                      </>
                    )}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Trust Center URL</label>
                    <input
                      type="url"
                      value={trustCenterUrl}
                      onChange={(e) => setTrustCenterUrl(e.target.value)}
                      className="input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div>
                    <label className="label">Trust Center Platform</label>
                    <input
                      type="text"
                      value={trustCenterPlatform}
                      onChange={(e) => setTrustCenterPlatform(e.target.value)}
                      className="input"
                      placeholder="e.g., Vanta, Drata, SafeBase"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card p-6 space-y-4">
            <button
              type="button"
              onClick={() => toggleSection('notes')}
              className="w-full flex items-center justify-between"
            >
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-400" />
                Notes
              </h2>
              <ChevronDown className={cn(
                'w-5 h-5 text-surface-400 transition-transform',
                openSections.has('notes') && 'rotate-180'
              )} />
            </button>
            
            {openSections.has('notes') && (
              <div className="pt-4">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Any additional notes about this client..."
                />
              </div>
            )}
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

