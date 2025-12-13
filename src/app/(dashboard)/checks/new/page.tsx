'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  RefreshCw, 
  Loader2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

interface Client {
  id: string
  name: string
  defaultCadence: string
  systemEngineerName: string | null
  primaryConsultantName: string | null
  assignments?: Array<{
    id: string
    userId: string
    role: string
    user: {
      id: string
      name: string | null
      email: string | null
      image: string | null
    }
  }>
  clientSystems: {
    system: {
      id: string
      name: string
      category: string
    }
  }[]
}

interface Engineer {
  id: string
  name: string
  email: string | null
  role: string
}

export default function NewCheckPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('client')
  
  const [clients, setClients] = useState<Client[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Client searchable dropdown
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  
  // Engineer searchable dropdown
  const [engineerName, setEngineerName] = useState('')
  const [engineerSearch, setEngineerSearch] = useState('')
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false)
  
  // Form state
  const [cadence, setCadence] = useState('MONTHLY')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [notes, setNotes] = useState('')
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true)
  const [sendReminder, setSendReminder] = useState(true)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)

  // Get selected client details
  const selectedClient = clients.find(c => c.id === clientId)
  
  // Filter clients based on search
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )
  
  // Filter engineers based on search
  const filteredEngineers = engineers.filter(e =>
    e.name?.toLowerCase().includes(engineerSearch.toLowerCase()) ||
    e.email?.toLowerCase().includes(engineerSearch.toLowerCase())
  )

  useEffect(() => {
    fetchData()
    // Set default date to today
    const today = new Date()
    setScheduledDate(today.toISOString().split('T')[0])
  }, [])

  // Set client ID once clients are loaded (for preselected)
  useEffect(() => {
    if (preselectedClientId && clients.length > 0 && !clientId) {
      const preselected = clients.find(c => c.id === preselectedClientId)
      if (preselected) {
        setClientId(preselectedClientId)
        setClientSearch(preselected.name)
      }
    }
  }, [preselectedClientId, clients, clientId])

  const fetchData = async () => {
    try {
      const [clientsRes, engineersRes] = await Promise.all([
        fetch('/api/clients?limit=200&status=ACTIVE'),
        fetch('/api/users')
      ])
      
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.clients || [])
      }
      
      if (engineersRes.ok) {
        const data = await engineersRes.json()
        // Filter to only show engineers and admins
        const engineerUsers = (data.users || data || []).filter(
          (u: Engineer) => u.role === 'IT_ENGINEER' || u.role === 'ADMIN'
        )
        setEngineers(engineerUsers)
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Check calendar connection status
  useEffect(() => {
    const checkCalendarStatus = async () => {
      try {
        const res = await fetch('/api/calendar/status')
        const data = await res.json()
        setCalendarConnected(data.connected || false)
      } catch (err) {
        setCalendarConnected(false)
      }
    }
    checkCalendarStatus()
  }, [])

  // Update defaults when client is selected
  useEffect(() => {
    if (selectedClient) {
      setCadence(selectedClient.defaultCadence || 'MONTHLY')
      // Priority: 1) SE from assignments, 2) legacy systemEngineerName, 3) PRIMARY from assignments, 4) legacy primaryConsultantName
      const seAssignments = selectedClient.assignments?.filter(a => a.role === 'SE') || []
      const primaryAssignments = selectedClient.assignments?.filter(a => a.role === 'PRIMARY') || []
      const seName = seAssignments.length > 0 ? seAssignments[0].user.name : null
      const primaryName = primaryAssignments.length > 0 ? primaryAssignments[0].user.name : null
      
      if (seName) {
        setEngineerName(seName)
        setEngineerSearch(seName)
      } else if (selectedClient.systemEngineerName) {
        setEngineerName(selectedClient.systemEngineerName)
        setEngineerSearch(selectedClient.systemEngineerName)
      } else if (primaryName) {
        setEngineerName(primaryName)
        setEngineerSearch(primaryName)
      } else if (selectedClient.primaryConsultantName) {
        setEngineerName(selectedClient.primaryConsultantName)
        setEngineerSearch(selectedClient.primaryConsultantName)
      }
    }
  }, [selectedClient])

  const handleClientSelect = (client: Client) => {
    setClientId(client.id)
    setClientSearch(client.name)
    setShowClientDropdown(false)
  }

  const handleEngineerSelect = (engineer: Engineer) => {
    setEngineerName(engineer.name || '')
    setEngineerSearch(engineer.name || '')
    setShowEngineerDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!clientId) {
      setError('Please select a client')
      setSubmitting(false)
      return
    }

    try {
      // Combine date and time
      const dateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)

      const res = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          engineerName,
          cadence,
          scheduledDate: dateTime.toISOString(),
          notes,
          createCalendarEvent,
          sendReminder,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create check')
      }

      const data = await res.json()
      
      // Build description based on what was created
      let description = `Infrastructure check for ${selectedClient?.name} scheduled.`
      if (data.calendarEvent) {
        description += ' Calendar event created.'
      } else if (data.calendarError && createCalendarEvent) {
        description += ` Note: ${data.calendarError}`
        toast.warning('Check created, but calendar event failed', {
          description: data.calendarError,
        })
      }
      
      if (!data.calendarError || !createCalendarEvent) {
        toast.success('Check scheduled successfully!', { description })
      }
      
      // Redirect to the new check or checks list
      router.push(`/checks/${data.check.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create check')
      toast.error('Failed to schedule check', {
        description: err.message
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="text-surface-400">Loading...</p>
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
              href="/checks" 
              className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-surface-400" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-white">New Infrastructure Check</h1>
              <p className="text-sm text-surface-400">Schedule a new check for a client</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Client Selection */}
          <div className="card p-6 space-y-4 overflow-visible relative z-30">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" />
              Client
            </h2>

            <div>
              <label className="label">Select Client</label>
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                    if (clientId) {
                      const selected = clients.find(c => c.id === clientId)
                      if (selected && selected.name !== e.target.value) {
                        setClientId('')
                      }
                    }
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowClientDropdown(false), 200)
                  }}
                  placeholder={clients.length === 0 ? 'No clients available' : 'Type to search clients...'}
                  className="input w-full"
                  disabled={clients.length === 0}
                />
                {showClientDropdown && filteredClients.length > 0 && (
                  <div 
                    className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleClientSelect(c)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-700 text-sm text-surface-200 transition-colors border-b border-surface-700/50 last:border-0"
                      >
                        <div className="font-medium">{c.name}</div>
                        {c.systemEngineerName && (
                          <div className="text-xs text-surface-500">SE: {c.systemEngineerName}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {clients.length > 0 && (
                <p className="text-xs text-surface-500 mt-1">
                  {filteredClients.length} of {clients.length} client{clients.length !== 1 ? 's' : ''} shown
                </p>
              )}
            </div>

            {selectedClient && selectedClient.clientSystems && selectedClient.clientSystems.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-surface-400 mb-2">Systems to check ({selectedClient.clientSystems.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClient.clientSystems.map((cs) => (
                    <span 
                      key={cs.system.id}
                      className="px-2 py-1 bg-surface-700 rounded text-xs text-surface-300"
                    >
                      {cs.system.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assignment & Schedule */}
          <div className="card p-6 space-y-4 overflow-visible relative z-20">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <User className="w-5 h-5 text-brand-400" />
              Assignment
            </h2>

            <div>
              <label className="label">Assigned Engineer</label>
              <div className="relative">
                <input
                  type="text"
                  value={engineerSearch}
                  onChange={(e) => {
                    setEngineerSearch(e.target.value)
                    setEngineerName(e.target.value)
                    setShowEngineerDropdown(true)
                  }}
                  onFocus={() => setShowEngineerDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowEngineerDropdown(false), 200)
                  }}
                  placeholder="Type to search or enter engineer name..."
                  className="input w-full"
                />
                {showEngineerDropdown && filteredEngineers.length > 0 && (
                  <div 
                    className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {filteredEngineers.map((e) => (
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
                    ))}
                  </div>
                )}
              </div>
              {engineers.length > 0 && (
                <p className="text-xs text-surface-500 mt-1">
                  {filteredEngineers.length} of {engineers.length} engineer{engineers.length !== 1 ? 's' : ''} shown
                </p>
              )}
              {selectedClient?.systemEngineerName && engineerName !== selectedClient.systemEngineerName && (
                <p className="text-xs text-surface-500 mt-1">
                  Default SE: {selectedClient.systemEngineerName}
                </p>
              )}
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Cadence
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { value: 'WEEKLY', label: 'Weekly' },
                  { value: 'BIWEEKLY', label: 'Bi-weekly' },
                  { value: 'MONTHLY', label: 'Monthly' },
                  { value: 'BIMONTHLY', label: 'Bi-monthly' },
                  { value: 'QUARTERLY', label: 'Quarterly' },
                  { value: 'ADHOC', label: 'Ad-hoc' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCadence(option.value)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      cadence === option.value
                        ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                        : 'bg-surface-800 border-surface-600 text-surface-300 hover:border-surface-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                label="Date"
                required
                min={new Date().toISOString().split('T')[0]}
              />
              <TimePicker
                value={scheduledTime}
                onChange={setScheduledTime}
                label="Time"
                required
              />
            </div>
          </div>

          {/* Notes & Options */}
          <div className="card p-6 space-y-4 relative z-10">
            <h2 className="text-lg font-medium text-white">Options</h2>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Any additional notes for this check..."
              />
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createCalendarEvent}
                    onChange={(e) => setCreateCalendarEvent(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-500 bg-surface-700 text-brand-500 focus:ring-brand-500/50"
                  />
                  <span className="text-sm text-surface-300">
                    Create Google Calendar event
                  </span>
                </label>
                {createCalendarEvent && calendarConnected === false && (
                  <div className="mt-2 ml-7 flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Google Calendar not connected</p>
                      <p className="text-amber-300/80 mt-0.5">
                        Connect your calendar in{' '}
                        <Link href="/settings/my-integrations" className="underline hover:text-amber-300">
                          My Integrations
                        </Link>
                        {' '}to create calendar events.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendReminder}
                  onChange={(e) => setSendReminder(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-500 bg-surface-700 text-brand-500 focus:ring-brand-500/50"
                />
                <span className="text-sm text-surface-300">
                  Send reminder 1 day before
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/checks" className="btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || !clientId}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Schedule Check
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
