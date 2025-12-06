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
  
  // For searchable engineer dropdown
  const [engineers, setEngineers] = useState<Array<{ id: string; name: string | null; email: string | null }>>([])
  const [engineerSearch, setEngineerSearch] = useState('')
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false)
  
  // Track which comboboxes are open for z-index management
  const [openComboboxes, setOpenComboboxes] = useState<Set<string>>(new Set())

  // Load engineers on mount
  useEffect(() => {
    fetchEngineers()
  }, [])

  const fetchEngineers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
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
                  placeholder="Search for engineer..."
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
                Who will be assigned to infrastructure checks for this client
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

