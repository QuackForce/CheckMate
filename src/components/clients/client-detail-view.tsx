'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  MapPin, 
  Globe, 
  ExternalLink,
  Calendar,
  Clock,
  Users,
  Shield,
  Hash,
  Edit,
  RefreshCw,
  ClipboardCheck,
  X,
  Loader2,
  Search,
  Copy,
  Check,
} from 'lucide-react'
import { cn, getCadenceLabel, formatDate } from '@/lib/utils'
import { SecurityChecks } from './security-checks'
import { ClientSystems } from './client-systems'
import { ClientCompliance } from './client-compliance'
import { toast } from 'sonner'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface Client {
  id: string
  name: string
  status: string
  priority: string | null
  slackChannelId: string | null
  slackChannelName: string | null
  notionPageId: string | null
  notionLastSynced: Date | null
  defaultCadence: string
  customCadenceDays: number | null
  checkCadence: string | null
  pocEmail: string | null
  officeAddress: string | null
  hoursPerMonth: string | null
  itSyncsFrequency: string | null
  onsitesFrequency: string | null
  complianceFrameworks: string[]
  trustCenterUrl: string | null
  trustCenterPlatform: string | null
  dmarc: string | null
  dmarcRecord: string | null
  dmarcLastChecked: Date | null
  spf: string | null
  spfRecord: string | null
  spfLastChecked: Date | null
  dkim: string | null
  dkimSelector: string | null
  dkimRecord: string | null
  dkimLastChecked: Date | null
  sslStatus: string | null
  sslIssuer: string | null
  sslExpiry: Date | null
  sslLastChecked: Date | null
  accessRequests: string | null
  userAccessReviews: string | null
  acceptedPasswordPolicy: string | null
  teams: string[]
  teamAssignments?: Array<{
    id: string
    teamId: string
    team: {
      id: string
      name: string
      description: string | null
      color: string | null
      tag: string | null
    }
  }>
  hrProcesses: string[]
  policies: string[]
  itGlueUrl: string | null
  zendeskUrl: string | null
  trelloUrl: string | null
  onePasswordUrl: string | null
  sharedDriveUrl: string | null
  customUrls: Array<{ label: string; url: string }> | null
  websiteUrl: string | null
  harvestProjectId: string | null
  estimation: number | null
  startDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  primaryEngineer: { id: string; name: string | null; email: string | null; image?: string | null } | null
  secondaryEngineer: { id: string; name: string | null; email: string | null; image?: string | null } | null
  // Notion-synced engineer names
  systemEngineerName: string | null
  primaryConsultantName: string | null
  secondaryConsultantNames: string[]
  itManagerName: string | null
  grceEngineerName: string | null
  // App-specific override
  infraCheckAssigneeName: string | null
  infraCheckAssigneeUser: { id: string; name: string | null; email: string | null; image: string | null } | null
  checks: any[]
}


interface ClientDetailViewProps {
  client: Client
  canEdit?: boolean // If false, hide edit/create buttons (for viewers)
}

// Reusable UserBubble component with popover
function UserBubble({ 
  user, 
  bgColor, 
  borderColor,
  size = 'w-10 h-10'
}: { 
  user: { name: string | null; email: string | null; image: string | null }
  bgColor: string
  borderColor: string
  size?: string
}) {
  const displayName = user.name || 'Unknown'
  const displayEmail = user.email || null
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            size,
            'rounded-full border-2 flex items-center justify-center overflow-hidden relative z-0 hover:z-10 transition-z cursor-pointer',
            bgColor,
            borderColor
          )}
          title={displayName}
        >
          {user.image ? (
            <img src={user.image} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className={cn(
              'text-white font-medium',
              size === 'w-8 h-8' ? 'text-xs' : size === 'w-7 h-7' ? 'text-[10px]' : 'text-[10px]'
            )}>{displayName.charAt(0) || '?'}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="top" align="center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">{displayName}</p>
          {displayEmail && (
            <p className="text-xs text-surface-400">{displayEmail}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Helper to get bubble size - all bubbles are the same size (w-8 h-8)
function getBubbleSize(count: number): string {
  return 'w-8 h-8' // Same size for all users (1-4)
}

// Fixed width container to ensure all text aligns - fits 4 bubbles at smallest size (w-6) with overlap
// 4 bubbles at 24px each with -space-x-2 (8px overlap) = 24 + 16 + 16 + 16 = 72px, but we'll use 80px for safety
const BUBBLE_CONTAINER_WIDTH = 'w-20' // 80px - fixed width for all containers

export function ClientDetailView({ client, canEdit = true }: ClientDetailViewProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [channels, setChannels] = useState<Array<{ id: string; name: string; isPrivate: boolean }>>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [testChannelId, setTestChannelId] = useState('')
  const [testingChannel, setTestingChannel] = useState(false)
  const [testResult, setTestResult] = useState<{ accessible: boolean; channel?: any; error?: string; message?: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }


  const fetchChannels = async () => {
    setLoadingChannels(true)
    try {
      const res = await fetch('/api/slack/channels')
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to fetch channels')
      }
      const data = await res.json()
      setChannels(data.channels || [])
    } catch (error: any) {
      toast.error('Failed to fetch Slack channels', { description: error.message })
    } finally {
      setLoadingChannels(false)
    }
  }

  const handleOpenPicker = () => {
    setShowChannelPicker(true)
    // Always fetch fresh channels when opening the modal
    fetchChannels()
  }

  const handleTestChannel = async () => {
    if (!testChannelId.trim()) {
      toast.error('Please enter a channel ID')
      return
    }

    setTestingChannel(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/slack/channels/${testChannelId.trim()}`)
      const data = await res.json()

      if (data.accessible) {
        setTestResult({
          accessible: true,
          channel: data.channel,
        })
        toast.success(`Bot can access channel: #${data.channel.name}`)
      } else {
        setTestResult({
          accessible: false,
          error: data.error,
          message: data.message,
        })
        toast.error(data.message || 'Bot cannot access this channel')
      }
    } catch (error: any) {
      setTestResult({
        accessible: false,
        error: 'Failed to test channel',
        message: error.message,
      })
      toast.error('Failed to test channel', { description: error.message })
    } finally {
      setTestingChannel(false)
    }
  }

  const handleSelectChannel = async (channel: { id: string; name: string }) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slackChannelId: channel.id,
          slackChannelName: `#${channel.name}`,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update channel')
      }

      toast.success('Slack channel connected!')
      setShowChannelPicker(false)
      router.refresh()
    } catch (error: any) {
      toast.error('Failed to connect channel', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleManualConnect = async () => {
    if (!testChannelId.trim()) {
      toast.error('Please enter a channel ID')
      return
    }

    setSaving(true)
    try {
      // First verify the channel is accessible
      const testRes = await fetch(`/api/slack/channels/${testChannelId.trim()}`)
      const testData = await testRes.json()

      if (!testData.accessible) {
        throw new Error(testData.message || 'Channel is not accessible')
      }

      // If accessible, connect it
      await handleSelectChannel({
        id: testData.channel.id,
        name: testData.channel.name,
      })
    } catch (error: any) {
      toast.error('Failed to connect channel', { description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
      INACTIVE: 'bg-surface-700 text-surface-400 border-surface-600',
      ONBOARDING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      OFFBOARDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      ON_HOLD: 'bg-red-500/20 text-red-400 border-red-500/30',
      EXITING: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      AS_NEEDED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    }
    return styles[status] || 'bg-surface-700 text-surface-400'
  }

  const quickLinks = [
    { label: 'IT Glue', url: client.itGlueUrl, icon: Globe },
    { label: 'Zendesk', url: client.zendeskUrl, icon: ExternalLink },
    { label: 'Trello', url: client.trelloUrl, icon: ExternalLink },
    { label: '1Password', url: client.onePasswordUrl, icon: Shield },
    { label: 'Shared Drive', url: client.sharedDriveUrl, icon: ExternalLink },
    { label: 'Website', url: client.websiteUrl, icon: Globe },
    // Add custom URLs
    ...(client.customUrls && Array.isArray(client.customUrls) 
      ? client.customUrls.map((customUrl: { label: string; url: string }) => ({ 
          label: customUrl.label, 
          url: customUrl.url, 
          icon: ExternalLink 
        }))
      : []
    ),
  ].filter(link => link.url)

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/clients" 
              className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-surface-400" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{client.name}</h1>
                <span className={cn('badge border', getStatusBadge(client.status))}>
                  {client.status.replace('_', ' ')}
                </span>
                {/* Show team tags from teamAssignments if available, otherwise fall back to old teams array */}
                {client.teamAssignments && client.teamAssignments.length > 0 ? (
                  client.teamAssignments.map((teamAssignment) => {
                    const tag = teamAssignment.team.tag || teamAssignment.team.name
                    const color = teamAssignment.team.color || '#3B82F6'
                    return (
                      <span 
                        key={teamAssignment.id} 
                        className="badge border"
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                          borderColor: `${color}30`
                        }}
                      >
                        {tag}
                      </span>
                    )
                  })
                ) : (
                  client.teams.length > 0 && client.teams.map((team) => (
                    <span key={team} className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {team}
                    </span>
                  ))
                )}
                {client.priority && (
                  <span className="badge bg-surface-700 text-surface-300">
                    {client.priority}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Link href={`/clients/${client.id}/edit`} className="btn-ghost flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                  <Link href={`/checks/new?client=${client.id}`} className="btn-primary">
                    <Calendar className="w-4 h-4" />
                    Schedule Check
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.label}
                href={link.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-surface-800 hover:bg-surface-700 rounded-lg text-sm text-surface-300 hover:text-white transition-colors"
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact & Location */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Contact & Location</h2>
              <div className="grid grid-cols-2 gap-4">
                {client.pocEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-surface-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-500 uppercase tracking-wide">POC Email</p>
                      <div className="flex items-center gap-2">
                        <a 
                          href={`mailto:${client.pocEmail}`}
                          className="text-surface-200 hover:text-brand-400 transition-colors flex-1 min-w-0 truncate"
                        >
                          {client.pocEmail}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(client.pocEmail!, 'pocEmail')}
                          className="flex-shrink-0 p-1.5 rounded hover:bg-surface-700 transition-colors"
                          title="Copy email"
                        >
                          {copiedField === 'pocEmail' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-surface-400 hover:text-surface-300" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {client.officeAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-surface-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-500 uppercase tracking-wide">Office Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-surface-200 flex-1 min-w-0">{client.officeAddress}</p>
                        <button
                          type="button"
                          onClick={() => handleCopy(client.officeAddress!, 'officeAddress')}
                          className="flex-shrink-0 p-1.5 rounded hover:bg-surface-700 transition-colors"
                          title="Copy address"
                        >
                          {copiedField === 'officeAddress' ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-surface-400 hover:text-surface-300" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {client.startDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-surface-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide">Client Since</p>
                      <p className="text-surface-200">{formatDate(client.startDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Service Levels */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Service Levels</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">HPM</p>
                  <p className="text-lg font-medium text-white">{client.hoursPerMonth || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">IT Syncs</p>
                  <p className="text-lg font-medium text-white">{client.itSyncsFrequency || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Onsites</p>
                  <p className="text-lg font-medium text-white">{client.onsitesFrequency || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Check Cadence</p>
                  <p className="text-lg font-medium text-white">{getCadenceLabel(client.defaultCadence)}</p>
                </div>
              </div>
            </div>

            {/* Security Checks (Automated) */}
            <SecurityChecks
              clientId={client.id}
              domain={client.websiteUrl}
              dmarcValue={client.dmarc}
              dmarcRecord={client.dmarcRecord}
              dmarcLastChecked={client.dmarcLastChecked}
              spfValue={client.spf}
              spfRecord={client.spfRecord}
              spfLastChecked={client.spfLastChecked}
              dkimValue={client.dkim}
              dkimSelector={client.dkimSelector}
              dkimRecord={client.dkimRecord}
              dkimLastChecked={client.dkimLastChecked}
              sslStatus={client.sslStatus}
              sslIssuer={client.sslIssuer}
              sslExpiry={client.sslExpiry}
              sslLastChecked={client.sslLastChecked}
            />

            {/* HR Processes & Policies - Only show if there's data */}
            {(client.hrProcesses.length > 0 || client.policies.length > 0) && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">HR & Policies</h2>
                <div className="space-y-4">
                  {client.hrProcesses.length > 0 && (
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">HR Processes</p>
                      <div className="flex flex-wrap gap-2">
                        {client.hrProcesses.map((process) => (
                          <span key={process} className="badge bg-blue-500/20 text-blue-400">
                            {process}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {client.policies.length > 0 && (
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide mb-2">Policies</p>
                      <div className="flex flex-wrap gap-2">
                        {client.policies.slice(0, 10).map((policy) => (
                          <span key={policy} className="badge bg-purple-500/20 text-purple-400">
                            {policy}
                          </span>
                        ))}
                        {client.policies.length > 10 && (
                          <span className="badge bg-surface-700 text-surface-400">
                            +{client.policies.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Compliance */}
            <ClientCompliance 
              clientId={client.id}
              complianceFrameworks={client.complianceFrameworks}
              trustCenterUrl={client.trustCenterUrl}
              trustCenterPlatform={client.trustCenterPlatform}
            />

            {/* Systems */}
            <ClientSystems clientId={client.id} />

            {/* Notes */}
            {client.notes && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notes</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-surface-300 whitespace-pre-wrap">{client.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Engineers - From Notion */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Assigned Team</h2>
              <div className="space-y-3">
                {/* Infra Check Assignee - Either override or SE */}
                {(() => {
                  // Priority: 1) infraCheckAssigneeName override, 2) SE from assignments table, 3) legacy systemEngineerName
                  // Filter out orphaned assignments where user is null
                  const validAssignments = (client as any).assignments?.filter((a: any) => a.User !== null) || []
                  const seAssignments = validAssignments.filter((a: any) => a.role === 'SE') || []
                  const seFromAssignments = seAssignments.length > 0 ? seAssignments[0].user?.name : null
                  const assignee = client.infraCheckAssigneeName || seFromAssignments || client.systemEngineerName
                  const isOverride =
                    !!client.infraCheckAssigneeName &&
                    client.infraCheckAssigneeName !== seFromAssignments &&
                    client.infraCheckAssigneeName !== client.systemEngineerName

                  // Get user from assignments if available, otherwise use looked-up user
                  const seUserFromAssignments = seAssignments.length > 0 ? seAssignments[0].user : null
                  const avatarImage = client.infraCheckAssigneeUser?.image || seUserFromAssignments?.image || null
                  const assigneeEmail = client.infraCheckAssigneeUser?.email || seUserFromAssignments?.email || null

                  if (assignee) {
                    return (
                      <div
                        className={cn(
                          'flex items-center gap-3 p-2 -mx-2 rounded-lg',
                          isOverride
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-brand-500/10 border border-brand-500/20'
                        )}
                      >
                        <div className="flex flex-col justify-center">
                          <p className="text-white font-medium leading-tight">Infra Check Assignee</p>
                          <p
                            className={cn(
                              'text-xs leading-tight',
                              isOverride ? 'text-amber-400' : 'text-brand-400'
                            )}
                          >
                            {isOverride ? 'Override' : 'Default (SE)'}
                          </p>
                        </div>
                        <div className="flex -space-x-2">
                          <UserBubble
                            user={{
                              name: assignee,
                              email: assigneeEmail,
                              image: avatarImage
                            }}
                            bgColor={isOverride ? 'bg-amber-600' : 'bg-brand-600'}
                            borderColor="border-surface-800"
                            size="w-8 h-8"
                          />
                        </div>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="flex items-center gap-3 p-2 -mx-2 rounded-lg border border-dashed border-surface-600 text-surface-500">
                      <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-surface-400">No Infra Check Assignee</p>
                        <p className="text-xs text-surface-500">Set via Edit or Notion sync</p>
                      </div>
                    </div>
                  )
                })()}
                
                {/* Show SE(s) separately if there's an override OR if we have multiple SEs - Show overlapping bubbles if multiple */}
                {(() => {
                  // Filter out orphaned assignments where user is null
                  const validAssignments = (client as any).assignments?.filter((a: any) => a.User !== null) || []
                  const seAssignments = validAssignments.filter((a: any) => a.role === 'SE') || []
                  const seNames = client.systemEngineerName ? [client.systemEngineerName] : []
                  
                  // Show if: 1) There's an override and we have SE assignments, OR 2) We have multiple SEs from assignments
                  const hasOverride = client.infraCheckAssigneeName && client.infraCheckAssigneeName !== client.systemEngineerName
                  const hasMultipleSEs = seAssignments.length > 1
                  
                  if ((hasOverride && (seAssignments.length > 0 || seNames.length > 0)) || (hasMultipleSEs && seAssignments.length > 0)) {
                    const users = seAssignments.length > 0 
                      ? seAssignments.map((a: any) => a.User)
                      : seNames.map((name: string) => ({ name, image: null, email: null }))
                    
                    return (
                      <div className={cn("flex items-center gap-3", hasOverride && "opacity-60")}>
                        <div className="flex flex-col justify-center">
                          <p className={cn("font-medium leading-tight", hasOverride ? "text-surface-300" : "text-white")}>
                            Default (SE)
                          </p>
                        </div>
                        <div className="flex -space-x-2">
                          {users.slice(0, 4).map((user: any, idx: number) => (
                            <UserBubble
                              key={idx}
                              user={user}
                              bgColor="bg-brand-600"
                              borderColor="border-surface-500"
                              size={getBubbleSize(users.length)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                
                {/* Primary Consultant - Show overlapping bubbles if multiple */}
                {(() => {
                  // Filter out orphaned assignments where user is null
                  const validAssignments = (client as any).assignments?.filter((a: any) => a.User !== null) || []
                  const primaryAssignments = validAssignments.filter((a: any) => a.role === 'PRIMARY') || []
                  const primaryNames = client.primaryConsultantName ? [client.primaryConsultantName] : []
                  
                  if (primaryAssignments.length > 0 || primaryNames.length > 0) {
                    const users = primaryAssignments.length > 0 
                      ? primaryAssignments.map((a: any) => a.User)
                      : primaryNames.map((name: string) => ({ name, image: null, email: null }))
                    
                    return (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col justify-center">
                          <p className="text-white font-medium leading-tight">Primary Consultant{users.length > 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex -space-x-2">
                          {users.slice(0, 4).map((user: any, idx: number) => (
                            <UserBubble
                              key={idx}
                              user={user}
                              bgColor="bg-emerald-600"
                              borderColor="border-surface-800"
                              size={getBubbleSize(users.length)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                
                {/* Secondaries - Show overlapping bubbles if multiple */}
                {(() => {
                  // Filter out orphaned assignments where user is null
                  const validAssignments = (client as any).assignments?.filter((a: any) => a.User !== null) || []
                  const secondaryAssignments = validAssignments.filter((a: any) => a.role === 'SECONDARY') || []
                  const secondaryNames = client.secondaryConsultantNames || []
                  
                  if (secondaryAssignments.length > 0 || secondaryNames.length > 0) {
                    const users = secondaryAssignments.length > 0 
                      ? secondaryAssignments.map((a: any) => a.User)
                      : secondaryNames.map((name: string) => ({ name, image: null, email: null }))
                    
                    return (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col justify-center">
                          <p className="text-white font-medium leading-tight">Secondary Consultant{users.length > 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex -space-x-2">
                          {users.slice(0, 4).map((user: any, idx: number) => (
                            <UserBubble
                              key={idx}
                              user={user}
                              bgColor="bg-surface-600"
                              borderColor="border-surface-800"
                              size={getBubbleSize(users.length)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                
                {/* IT Manager - Show overlapping bubbles if multiple */}
                {(() => {
                  // Filter out orphaned assignments where user is null
                  const validAssignments = (client as any).assignments?.filter((a: any) => a.User !== null) || []
                  const itManagerAssignments = validAssignments.filter((a: any) => a.role === 'IT_MANAGER') || []
                  const itManagerNames = client.itManagerName ? [client.itManagerName] : []
                  
                  if (itManagerAssignments.length > 0 || itManagerNames.length > 0) {
                    const users = itManagerAssignments.length > 0 
                      ? itManagerAssignments.map((a: any) => a.User)
                      : itManagerNames.map((name: string) => ({ name, image: null, email: null }))
                    
                    return (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col justify-center">
                          <p className="text-white font-medium leading-tight">IT Manager{users.length > 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex -space-x-2">
                          {users.slice(0, 4).map((user: any, idx: number) => (
                            <UserBubble
                              key={idx}
                              user={user}
                              bgColor="bg-purple-600"
                              borderColor="border-surface-800"
                              size={getBubbleSize(users.length)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
                
                {/* GRCE (Compliance) - Show overlapping bubbles if multiple */}
                {(() => {
                  // Filter out orphaned assignments where user is null
                  const validAssignments = (client as any).assignments?.filter((a: any) => a.User !== null) || []
                  const grceAssignments = validAssignments.filter((a: any) => a.role === 'GRCE') || []
                  const grceNames = client.grceEngineerName ? [client.grceEngineerName] : []
                  
                  if (grceAssignments.length > 0 || grceNames.length > 0) {
                    const users = grceAssignments.length > 0 
                      ? grceAssignments.map((a: any) => a.User)
                      : grceNames.map((name: string) => ({ name, image: null, email: null }))
                    
                    return (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col justify-center">
                          <p className="text-white font-medium leading-tight">GRCE Engineer{users.length > 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex -space-x-2">
                          {users.slice(0, 4).map((user: any, idx: number) => (
                            <UserBubble
                              key={idx}
                              user={user}
                              bgColor="bg-amber-600"
                              borderColor="border-surface-800"
                              size={getBubbleSize(users.length)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>

            {/* Slack Channel */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Slack Channel</h2>
              {client.slackChannelName ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-surface-500" />
                    <span className="text-surface-200">{client.slackChannelName}</span>
                  </div>
                  <button
                    onClick={handleOpenPicker}
                    className="btn-ghost text-xs"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-surface-500 mb-2">No Slack channel connected</p>
                  <button 
                    onClick={handleOpenPicker}
                    className="btn-ghost text-sm"
                  >
                    Connect Channel
                  </button>
                </div>
              )}
            </div>

            {/* Recent Checks */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Checks</h2>
                <Link href={`/checks?client=${client.id}`} className="text-sm text-brand-400 hover:text-brand-300">
                  View all
                </Link>
              </div>
              {client.checks && client.checks.length > 0 ? (
                <div className="space-y-3">
                  {client.checks.map((check) => (
                    <Link
                      key={check.id}
                      href={`/checks/${check.id}`}
                      className="block p-3 bg-surface-800/50 hover:bg-surface-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-surface-300">
                          {formatDate(check.scheduledDate)}
                        </span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          check.status === 'COMPLETED' && 'bg-brand-500/20 text-brand-400',
                          check.status === 'SCHEDULED' && 'bg-blue-500/20 text-blue-400',
                          check.status === 'IN_PROGRESS' && 'bg-yellow-500/20 text-yellow-400',
                        )}>
                          {check.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-surface-500 mb-2">No checks yet</p>
                  <Link href={`/checks/new?client=${client.id}`} className="btn-ghost text-sm">
                    Schedule First Check
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Slack Channel Picker Modal */}
      {showChannelPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Select Slack Channel
              </h2>
              <button
                onClick={() => {
                  setShowChannelPicker(false)
                  setSearchQuery('')
                  setTestChannelId('')
                  setTestResult(null)
                }}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-4">
              {/* Test Channel ID */}
              <div className="mb-4 p-3 bg-surface-800 rounded-lg border border-surface-700">
                <label className="block text-xs font-medium text-surface-400 mb-2">
                  Test Channel ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testChannelId}
                    onChange={(e) => {
                      setTestChannelId(e.target.value)
                      setTestResult(null)
                    }}
                    placeholder="C019YLK4ZU7"
                    className="flex-1 px-3 py-2 bg-surface-900 border border-surface-700 rounded-lg text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
                  />
                  <button
                    onClick={handleTestChannel}
                    disabled={testingChannel || !testChannelId.trim()}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {testingChannel ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
                {testResult && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    testResult.accessible 
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {testResult.accessible ? (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <div>
                            <strong>✓ Accessible:</strong> #{testResult.channel?.name}
                          </div>
                          <div className="text-xs opacity-75 space-x-2">
                            {testResult.channel?.isPrivate && <span>Private</span>}
                            {testResult.channel?.isMember && <span>Bot is a member</span>}
                            {testResult.channel?.isArchived && <span className="text-amber-400">⚠ ARCHIVED</span>}
                            {!testResult.channel?.isArchived && <span className="text-brand-400">Active</span>}
                          </div>
                        </div>
                        {!testResult.channel?.isArchived && (
                          <button
                            onClick={async () => {
                              if (testResult.channel) {
                                await handleSelectChannel({
                                  id: testResult.channel.id,
                                  name: testResult.channel.name,
                                })
                              }
                            }}
                            disabled={saving}
                            className="w-full mt-2 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors"
                          >
                            {saving ? 'Connecting...' : 'Connect This Channel'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <strong>✗ Not Accessible:</strong> {testResult.message || testResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Note */}
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Note:</strong> Only showing channels the bot can access. The bot can see public channels and private channels it's a member of. If you don't see a channel in the list above, use the "Test Channel ID" section above to test and connect it directly.
                </p>
              </div>

              {/* Search and Refresh */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search channels..."
                    className="input pl-10"
                  />
                </div>
                <button
                  onClick={fetchChannels}
                  disabled={loadingChannels}
                  className="px-3 py-2 bg-surface-800 hover:bg-surface-700 disabled:opacity-50 disabled:cursor-not-allowed border border-surface-700 rounded-lg transition-colors"
                  title="Refresh channels list"
                >
                  <RefreshCw className={`w-4 h-4 text-surface-400 ${loadingChannels ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Channels List */}
              {loadingChannels ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-center py-12 text-surface-500">
                  {searchQuery ? 'No channels found' : 'No channels available'}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {filteredChannels.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => handleSelectChannel(channel)}
                      disabled={saving}
                      className="w-full flex items-center gap-3 p-3 hover:bg-surface-800 rounded-lg transition-colors text-left disabled:opacity-50"
                    >
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        channel.isPrivate ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      )}>
                        <Hash className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium">#{channel.name}</p>
                        <p className="text-xs text-surface-500">
                          {channel.isPrivate ? 'Private channel' : 'Public channel'}
                        </p>
                      </div>
                    </button>
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

