'use client'

import { useState, useEffect } from 'react'
import { Settings, X, Check, Eye, EyeOff } from 'lucide-react'
import { SiNotion, SiSlack, SiGooglecalendar } from 'react-icons/si'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Custom Harvest icon component using the provided image URL
const HarvestIcon = ({ className }: { className?: string }) => (
  <img
    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-x1W951kD0L0siqZV74ycoymmFVvoKH88fQ&s"
    alt="Harvest"
    className={className}
    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
  />
)

interface Integration {
  id: string
  provider: string
  enabled: boolean
  hasApiKey: boolean
  hasApiSecret: boolean
  hasAccessToken: boolean
  connectedAt: string | null
  lastTestedAt: string | null
}

interface IntegrationConfig {
  name: string
  description: string
  icon: any
  color: string
  provider: string
  fields: {
    label: string
    key: string
    type: 'text' | 'password' | 'textarea'
    placeholder?: string
    required?: boolean
  }[]
}

const integrationConfigs: IntegrationConfig[] = [
  {
    name: 'Notion',
    description: 'Sync client data from your Notion database',
    icon: SiNotion,
    color: 'text-white bg-black',
    provider: 'notion',
    fields: [
      {
        label: 'Notion API Key',
        key: 'apiKey',
        type: 'password',
        placeholder: 'secret_...',
        required: true,
      },
      {
        label: 'Client Database ID',
        key: 'clientDatabaseId',
        type: 'text',
        placeholder: 'Database ID from Notion',
      },
      {
        label: 'Team Members Database ID',
        key: 'teamMembersDatabaseId',
        type: 'text',
        placeholder: 'Team Members Database ID',
      },
    ],
  },
  {
    name: 'Slack',
    description: 'Send check reports to client channels',
    icon: SiSlack,
    color: 'text-white bg-[#4A154B]',
    provider: 'slack',
    fields: [
      {
        label: 'Slack Bot Token',
        key: 'apiKey',
        type: 'password',
        placeholder: 'xoxb-...',
        required: true,
      },
    ],
  },
  {
    name: 'Harvest',
    description: 'Track time and sync with Harvest (per-user OAuth)',
    icon: HarvestIcon,
    color: 'text-white bg-[#FA5D00]',
    provider: 'harvest',
    fields: [
      {
        label: 'Harvest Client ID',
        key: 'apiKey',
        type: 'text',
        placeholder: 'OAuth Client ID',
        required: true,
      },
      {
        label: 'Harvest Client Secret',
        key: 'apiSecret',
        type: 'password',
        placeholder: 'OAuth Client Secret',
        required: true,
      },
      {
        label: 'Redirect URI',
        key: 'redirectUri',
        type: 'text',
        placeholder: 'https://yourdomain.com/api/harvest/callback',
        required: true,
      },
    ],
  },
  {
    name: 'Google Calendar',
    description: 'Sync checks with Google Calendar',
    icon: SiGooglecalendar,
    color: 'text-white bg-blue-500',
    provider: 'google_calendar',
    fields: [
      {
        label: 'OAuth Client ID',
        key: 'apiKey',
        type: 'text',
        placeholder: 'Google OAuth Client ID',
        required: true,
      },
      {
        label: 'OAuth Client Secret',
        key: 'apiSecret',
        type: 'password',
        placeholder: 'Google OAuth Client Secret',
        required: true,
      },
    ],
  },
]

export default function IntegrationsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      fetchIntegrations()
    }
  }, [isAdmin])

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data)
      }
    } catch (error) {
      console.error('Error fetching integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntegrationStatus = (provider: string): 'connected' | 'not_connected' => {
    const integration = integrations.find((i) => i.provider === provider)
    // For all integrations, check if org-wide config exists
    // Per-user tokens (Harvest, Google Calendar) are stored in User model separately
    return integration?.enabled && integration?.hasApiKey ? 'connected' : 'not_connected'
  }

  const handleEdit = async (provider: string) => {
    try {
      const res = await fetch(`/api/integrations/${provider}`)
      const config = integrationConfigs.find((c) => c.provider === provider)
      
      // Initialize empty form data
      const initialData: Record<string, string> = {}
      
      if (res.ok) {
        const data = await res.json()
        
        // Parse config JSON if it exists
        let parsedConfig: Record<string, string> = {}
        if (data.config) {
          try {
            parsedConfig = JSON.parse(data.config)
          } catch {
            // Not JSON, ignore
          }
        }
        
        // Set form data from existing integration
        config?.fields.forEach((field) => {
          if (field.key === 'apiKey') {
            initialData.apiKey = data.apiKey || ''
          } else if (field.key === 'apiSecret') {
            initialData.apiSecret = data.apiSecret || ''
          } else {
            initialData[field.key] = parsedConfig[field.key] || ''
          }
        })
      } else if (res.status === 404) {
        // Integration doesn't exist yet - start with empty form
        config?.fields.forEach((field) => {
          initialData[field.key] = ''
        })
      } else {
        // Other error
        const error = await res.json().catch(() => ({ error: 'Failed to load integration' }))
        toast.error(error.error || 'Failed to load integration settings')
        return
      }
      
      setFormData(initialData)
      setEditingProvider(provider)
    } catch (error) {
      console.error('Error fetching integration:', error)
      toast.error('Failed to load integration settings')
    }
  }

  const handleSave = async () => {
    if (!editingProvider) return
    
    setSaving(true)
    try {
      const config = integrationConfigs.find((c) => c.provider === editingProvider)
      if (!config) return
      
      // Build request body
      const body: any = {
        enabled: true,
      }
      
      // Extract API key and secret
      config.fields.forEach((field) => {
        if (field.key === 'apiKey') {
          body.apiKey = formData.apiKey || null
        } else if (field.key === 'apiSecret') {
          body.apiSecret = formData.apiSecret || null
        } else {
          // Store other fields in config JSON
          if (!body.config) {
            body.config = '{}'
          }
          try {
            const configObj = JSON.parse(body.config)
            configObj[field.key] = formData[field.key] || ''
            body.config = JSON.stringify(configObj)
          } catch {
            // Invalid JSON, create new
            body.config = JSON.stringify({ [field.key]: formData[field.key] || '' })
          }
        }
      })
      
      const res = await fetch(`/api/integrations/${editingProvider}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      if (res.ok) {
        toast.success(`${config.name} configured successfully!`)
        setEditingProvider(null)
        setFormData({})
        fetchIntegrations()
        
        // Clear integration caches if updated
        if (editingProvider === 'notion' || editingProvider === 'harvest') {
          try {
            await fetch(`/api/integrations/${editingProvider}/clear-cache`, { method: 'POST' })
          } catch {
            // Ignore cache clear errors
          }
        }
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save integration')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save integration')
    } finally {
      setSaving(false)
    }
  }

  const handleDisable = async (provider: string) => {
    if (!confirm('Are you sure you want to disable this integration?')) return
    
    try {
      const res = await fetch(`/api/integrations/${provider}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
      
      if (res.ok) {
        toast.success('Integration disabled')
        fetchIntegrations()
      }
    } catch (error) {
      toast.error('Failed to disable integration')
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Integrations</h2>
          <p className="text-sm text-surface-400 mt-1">
            Admin access required to configure integrations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Integrations</h2>
        <p className="text-sm text-surface-400 mt-1">
          Configure organization-wide integrations
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-surface-400">Loading integrations...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrationConfigs.map((config) => {
            const integration = integrations.find((i) => i.provider === config.provider)
            // For org-wide: check if configured
            // For per-user: check if org config exists (users connect individually)
            const isOrgWide = config.provider === 'notion' || config.provider === 'slack'
            const status = getIntegrationStatus(config.provider)
            
            return (
              <div key={config.name} className="card p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${config.color} flex items-center justify-center`}>
                    <config.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{config.name}</h3>
                      {status === 'connected' ? (
                        <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                          {isOrgWide ? 'Connected' : 'Configured'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-surface-700 text-surface-400 rounded-full">
                          Not configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-400 mt-1">{config.description}</p>
                    {isOrgWide ? (
                      <p className="text-xs text-surface-500 mt-1">
                        Organization-wide configuration
                      </p>
                    ) : (
                      <p className="text-xs text-surface-500 mt-1">
                        Users connect individually • Configure OAuth settings here
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => handleEdit(config.provider)}
                        className="btn-secondary text-sm"
                      >
                        {status === 'connected' ? 'Configure' : 'Connect'}
                      </button>
                      {status === 'connected' && (
                        <button
                          onClick={() => handleDisable(config.provider)}
                          className="btn-ghost text-sm text-red-400 hover:text-red-300"
                        >
                          Disable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Configure {integrationConfigs.find((c) => c.provider === editingProvider)?.name}
              </h2>
              <button
                onClick={() => {
                  setEditingProvider(null)
                  setFormData({})
                }}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {integrationConfigs
                .find((c) => c.provider === editingProvider)
                ?.fields.map((field) => (
                  <div key={field.key}>
                    <label className="label">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, [field.key]: e.target.value })
                        }
                        className="input w-full"
                        rows={3}
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type={
                            field.type === 'password' && !showPasswords[field.key]
                              ? 'password'
                              : 'text'
                          }
                          value={formData[field.key] || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, [field.key]: e.target.value })
                          }
                          className="input w-full pr-10"
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                [field.key]: !showPasswords[field.key],
                              })
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-300"
                          >
                            {showPasswords[field.key] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
            </div>
            
            <div className="p-6 border-t border-surface-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingProvider(null)
                  setFormData({})
                }}
                className="btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
