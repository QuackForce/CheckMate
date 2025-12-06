'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { cn, getCadenceLabel, formatDate } from '@/lib/utils'
import { SecurityChecks } from './security-checks'
import { ClientSystems } from './client-systems'
import { ClientCompliance } from './client-compliance'
import { toast } from 'sonner'

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
  hrProcesses: string[]
  policies: string[]
  itGlueUrl: string | null
  zendeskUrl: string | null
  trelloUrl: string | null
  onePasswordUrl: string | null
  sharedDriveUrl: string | null
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

export function ClientDetailView({ client, canEdit = true }: ClientDetailViewProps) {
  const router = useRouter()
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [channels, setChannels] = useState<Array<{ id: string; name: string; isPrivate: boolean }>>([])
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testChannelId, setTestChannelId] = useState('')
  const [testingChannel, setTestingChannel] = useState(false)
  const [testResult, setTestResult] = useState<{ accessible: boolean; channel?: any; error?: string; message?: string } | null>(null)

  const handleSync = async () => {
    if (!client.notionPageId) {
      toast.error('Client is not linked to Notion')
      return
    }
    
    setSyncing(true)
    try {
      const res = await fetch(`/api/clients/${client.id}/sync`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success(data.message)
        // Force a hard refresh to reload server component data
        window.location.reload()
      } else {
        toast.error(data.error || 'Sync failed')
      }
    } catch (error) {
      toast.error('Failed to sync from Notion')
    } finally {
      setSyncing(false)
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
                {client.teams.length > 0 && client.teams.map((team) => (
                  <span key={team} className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {team}
                  </span>
                ))}
                {client.priority && (
                  <span className="badge bg-surface-700 text-surface-300">
                    {client.priority}
                  </span>
                )}
              </div>
              {client.notionLastSynced && (
                <p className="text-xs text-surface-500 mt-1">
                  Last synced from Notion: {formatDate(client.notionLastSynced)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {client.notionPageId && (
                <button 
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn-ghost flex items-center gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", syncing && "animate-spin")} />
                  {syncing ? 'Syncing...' : 'Sync'}
                </button>
              )}
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
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide">POC Email</p>
                      <a 
                        href={`mailto:${client.pocEmail}`}
                        className="text-surface-200 hover:text-brand-400 transition-colors"
                      >
                        {client.pocEmail}
                      </a>
                    </div>
                  </div>
                )}
                {client.officeAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-surface-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-surface-500 uppercase tracking-wide">Office Address</p>
                      <p className="text-surface-200">{client.officeAddress}</p>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Engineers - From Notion */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Assigned Team</h2>
              <div className="space-y-3">
                {/* Infra Check Assignee - Either override or SE */}
                {(() => {
                  const assignee = client.infraCheckAssigneeName || client.systemEngineerName
                  const isOverride =
                    !!client.infraCheckAssigneeName &&
                    client.infraCheckAssigneeName !== client.systemEngineerName

                  // Only use the looked-up user's image - don't fallback to primaryEngineer
                  // If no image, we'll show initials instead
                  const avatarImage = client.infraCheckAssigneeUser?.image || null

                  if (assignee) {
                    return (
                      <div
                        className={`flex items-center gap-3 p-2 -mx-2 rounded-lg ${
                          isOverride
                            ? 'bg-amber-500/10 border border-amber-500/20'
                            : 'bg-brand-500/10 border border-brand-500/20'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {avatarImage ? (
                            <img
                              src={avatarImage}
                              alt={assignee}
                              className={cn(
                                'w-10 h-10 rounded-full object-cover border-2',
                                isOverride ? 'border-amber-500' : 'border-brand-500'
                              )}
                            />
                          ) : (
                            <div
                              className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center text-white font-medium',
                                isOverride ? 'bg-amber-600' : 'bg-brand-600'
                              )}
                            >
                              {assignee.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{assignee}</p>
                          <p
                            className={cn(
                              'text-xs',
                              isOverride ? 'text-amber-400' : 'text-brand-400'
                            )}
                          >
                            Infra Check Assignee {isOverride ? '(Override)' : '(SE)'}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded text-xs',
                            isOverride
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-brand-500/20 text-brand-300'
                          )}
                        >
                          <Shield className="w-3 h-3" />
                          {isOverride ? 'Override' : 'Default'}
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
                
                {/* Show SE separately if there's an override */}
                {client.infraCheckAssigneeName && client.infraCheckAssigneeName !== client.systemEngineerName && client.systemEngineerName && (
                  <div className="flex items-center gap-3 opacity-60">
                    <div className="flex-shrink-0">
                      {client.primaryEngineer?.image ? (
                        <img
                          src={client.primaryEngineer.image}
                          alt={client.systemEngineerName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-surface-500"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface-600 flex items-center justify-center text-white font-medium">
                          {client.systemEngineerName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-surface-300 font-medium">{client.systemEngineerName}</p>
                      <p className="text-xs text-surface-500">System Engineer (from Notion)</p>
                    </div>
                  </div>
                )}
                
                {/* Primary Consultant */}
                {client.primaryConsultantName && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {client.primaryConsultantName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{client.primaryConsultantName}</p>
                      <p className="text-xs text-surface-500">Primary Consultant</p>
                    </div>
                  </div>
                )}
                
                {/* Secondaries */}
                {client.secondaryConsultantNames && client.secondaryConsultantNames.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {client.secondaryConsultantNames.length}
                    </div>
                    <div>
                      <p className="text-white font-medium">{client.secondaryConsultantNames.join(', ')}</p>
                      <p className="text-xs text-surface-500">Secondary Consultant{client.secondaryConsultantNames.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}
                
                {/* IT Manager */}
                {client.itManagerName && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {client.itManagerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{client.itManagerName}</p>
                      <p className="text-xs text-surface-500">IT Manager</p>
                    </div>
                  </div>
                )}
                
                {/* GRCE (Compliance) */}
                {client.grceEngineerName && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                      {client.grceEngineerName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{client.grceEngineerName}</p>
                      <p className="text-xs text-surface-500">GRCE (Compliance)</p>
                    </div>
                  </div>
                )}
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
              {client.checks.length > 0 ? (
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

