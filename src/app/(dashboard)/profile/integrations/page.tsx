'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  RefreshCw,
  Link2,
  Unlink,
} from 'lucide-react'
import { SiGooglecalendar } from 'react-icons/si'
import { toast } from 'sonner'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  connected: boolean
  loading: boolean
  details?: string
}

// Custom Harvest icon
const HarvestIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-x1W951kD0L0siqZV74ycoymmFVvoKH88fQ&s"
    alt="Harvest"
    className={className}
    style={{ width: '1.25rem', height: '1.25rem', objectFit: 'contain' }}
  />
)

export default function MyIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'harvest',
      name: 'Harvest',
      description: 'Track time on infrastructure checks and sync with Harvest',
      icon: <HarvestIcon />,
      connected: false,
      loading: true,
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Create calendar events for scheduled checks and get reminders',
      icon: <SiGooglecalendar className="w-5 h-5 text-blue-500" />,
      connected: false,
      loading: true,
    },
  ])
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  // Check connection status on load
  useEffect(() => {
    checkAllStatuses()
  }, [])

  // Check for URL params (callback results)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    
    if (params.get('harvest_connected') === 'success') {
      toast.success('Harvest connected successfully!')
      // Clean URL
      window.history.replaceState({}, '', '/profile/integrations')
      checkHarvestStatus()
    }
    
    if (params.get('calendar_connected') === 'success') {
      toast.success('Google Calendar connected successfully!')
      window.history.replaceState({}, '', '/profile/integrations')
      checkCalendarStatus()
    }
    
    if (params.get('calendar_error')) {
      toast.error('Failed to connect Google Calendar')
      window.history.replaceState({}, '', '/profile/integrations')
    }
  }, [])

  const checkAllStatuses = async () => {
    await Promise.all([
      checkHarvestStatus(),
      checkCalendarStatus(),
    ])
  }

  const checkHarvestStatus = async () => {
    try {
      const res = await fetch('/api/harvest/status')
      const data = await res.json()
      
      setIntegrations(prev => prev.map(i => 
        i.id === 'harvest' 
          ? { 
              ...i, 
              connected: data.connected, 
              loading: false,
              details: data.connected ? `Account ID: ${data.accountId}` : undefined,
            }
          : i
      ))
    } catch (error) {
      setIntegrations(prev => prev.map(i => 
        i.id === 'harvest' ? { ...i, loading: false } : i
      ))
    }
  }

  const checkCalendarStatus = async () => {
    try {
      const res = await fetch('/api/calendar/status')
      const data = await res.json()
      
      setIntegrations(prev => prev.map(i => 
        i.id === 'google-calendar' 
          ? { 
              ...i, 
              connected: data.connected, 
              loading: false,
              details: data.needsRefresh ? 'Token needs refresh' : undefined,
            }
          : i
      ))
    } catch (error) {
      setIntegrations(prev => prev.map(i => 
        i.id === 'google-calendar' ? { ...i, loading: false } : i
      ))
    }
  }

  const handleConnect = async (integrationId: string) => {
    switch (integrationId) {
      case 'harvest':
        // Redirect to Harvest OAuth
        window.location.href = `/api/harvest/auth?returnTo=/profile/integrations`
        break
      case 'google-calendar':
        // Redirect to Google Calendar OAuth
        window.location.href = `/api/calendar/auth?returnTo=/profile/integrations`
        break
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    setDisconnecting(integrationId)
    
    try {
      let endpoint = ''
      switch (integrationId) {
        case 'harvest':
          endpoint = '/api/harvest/status'
          break
        case 'google-calendar':
          endpoint = '/api/calendar/status'
          break
        default:
          toast.error('Cannot disconnect this integration')
          return
      }

      const res = await fetch(endpoint, { method: 'DELETE' })
      
      if (!res.ok) {
        throw new Error('Failed to disconnect')
      }

      toast.success('Disconnected successfully')
      
      setIntegrations(prev => prev.map(i => 
        i.id === integrationId 
          ? { ...i, connected: false, details: undefined }
          : i
      ))
    } catch (error: any) {
      toast.error('Failed to disconnect', { description: error.message })
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-surface-800 rounded-xl border border-surface-700 p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface-700 flex items-center justify-center">
                  {integration.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{integration.name}</h3>
                    {integration.loading ? (
                      <RefreshCw className="w-4 h-4 text-surface-400 animate-spin" />
                    ) : integration.connected ? (
                      <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-surface-400 bg-surface-700 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-surface-400 mt-1">
                    {integration.description}
                  </p>
                  {integration.details && (
                    <p className="text-xs text-surface-500 mt-1">
                      {integration.details}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {integration.loading ? (
                  <div className="w-24 h-9 bg-surface-700 rounded-lg animate-pulse" />
                ) : integration.connected ? (
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    disabled={disconnecting === integration.id}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {disconnecting === integration.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Integration-specific features */}
            {integration.connected && (
              <div className="mt-4 pt-4 border-t border-surface-700">
                <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">
                  Features enabled
                </h4>
                <div className="flex flex-wrap gap-2">
                  {integration.id === 'harvest' && (
                    <>
                      <span className="text-xs bg-surface-700 text-surface-300 px-2 py-1 rounded">
                        Time tracking on checks
                      </span>
                      <span className="text-xs bg-surface-700 text-surface-300 px-2 py-1 rounded">
                        Sync timers to Harvest
                      </span>
                    </>
                  )}
                  {integration.id === 'google-calendar' && (
                    <>
                      <span className="text-xs bg-surface-700 text-surface-300 px-2 py-1 rounded">
                        Create check events
                      </span>
                      <span className="text-xs bg-surface-700 text-surface-300 px-2 py-1 rounded">
                        Automatic reminders
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/calendar/test', { method: 'POST' })
                            const data = await res.json()
                            if (res.ok) {
                              toast.success('Test event created!', {
                                description: 'Check your Google Calendar for the test event.',
                                action: data.event?.htmlLink ? {
                                  label: 'Open Event',
                                  onClick: () => window.open(data.event.htmlLink, '_blank'),
                                } : undefined,
                              })
                            } else {
                              toast.error('Test failed', { description: data.error || data.details })
                            }
                          } catch (error: any) {
                            toast.error('Test failed', { description: error.message })
                          }
                        }}
                        className="text-xs bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 px-2 py-1 rounded transition-colors"
                      >
                        Test Connection
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-surface-800/50 rounded-xl p-4 border border-surface-700">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">Organization Integrations</h4>
            <p className="text-sm text-surface-400 mt-1">
              Some integrations like Notion and Slack bots are configured at the organization level.
              Admins can manage these in{' '}
              <a href="/settings/integrations" className="text-brand-400 hover:underline">
                Settings → Integrations
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


