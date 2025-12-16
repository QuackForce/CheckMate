'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Building2, RefreshCw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

interface Client {
  id: string
  name: string
  defaultCadence: string
  systemEngineerName: string | null
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
}

interface Engineer {
  id: string
  name: string
  email: string | null
  role: string
}

export function ScheduleForm() {
  const [clients, setClients] = useState<Client[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Client searchable dropdown
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  
  // Engineer searchable dropdown
  const [engineerName, setEngineerName] = useState('')
  const [engineerSearch, setEngineerSearch] = useState('')
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false)
  
  const [cadence, setCadence] = useState('MONTHLY')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [createCalendarEvent, setCreateCalendarEvent] = useState(true)
  const [sendReminder, setSendReminder] = useState(true)

  const router = useRouter()

  useEffect(() => {
    fetchData()
    // Set default date to today
    const today = new Date()
    setDate(today.toISOString().split('T')[0])
  }, [])

  const fetchData = async () => {
    try {
      const [clientsRes, engineersRes] = await Promise.all([
        fetch('/api/clients?limit=200&status=ACTIVE'),
        fetch('/api/users?limit=200')
      ])
      
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.clients || [])
      }
      
      if (engineersRes.ok) {
        const data = await engineersRes.json()
        // Handle both paginated response (data.users) and array response (backward compatibility)
        const engineerUsers = (data.users || data || []).filter(
          (u: Engineer) => u.role === 'IT_ENGINEER' || u.role === 'ADMIN'
        )
        setEngineers(engineerUsers)
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  // Filter clients based on search
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )
  
  // Filter engineers based on search
  const filteredEngineers = engineers.filter(e =>
    e.name?.toLowerCase().includes(engineerSearch.toLowerCase()) ||
    e.email?.toLowerCase().includes(engineerSearch.toLowerCase())
  )

  // Update cadence when client is selected
  useEffect(() => {
    const selectedClient = clients.find(c => c.id === clientId)
    if (selectedClient) {
      setCadence(selectedClient.defaultCadence || 'MONTHLY')
      // Priority: 1) SE from assignments, 2) legacy systemEngineerName
      // Filter out orphaned assignments where user is null
      const validAssignments = selectedClient.assignments?.filter((a: any) => a.User !== null) || []
      const seAssignments = validAssignments.filter(a => a.role === 'SE') || []
      const seName = seAssignments.length > 0 ? seAssignments[0].User?.name : null
      
      if (seName) {
        setEngineerName(seName)
        setEngineerSearch(seName)
      } else if (selectedClient.systemEngineerName) {
        setEngineerName(selectedClient.systemEngineerName)
        setEngineerSearch(selectedClient.systemEngineerName)
      }
    }
  }, [clientId, clients])

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
    
    if (!clientId) {
      toast.error('Please select a client')
      return
    }
    
    setSubmitting(true)
    
    try {
      // Combine date and time
      const dateTime = new Date(`${date}T${time}:00`)
      const selectedClient = clients.find(c => c.id === clientId)

      const res = await fetch('/api/checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          engineerName,
          cadence,
          scheduledDate: dateTime.toISOString(),
          createCalendarEvent,
          sendReminder,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create check')
      }

      const data = await res.json()
      
      let description = `Infrastructure check for ${selectedClient?.name} scheduled.`
      if (data.calendarEvent) {
        description += ' Calendar event created.'
      }
      
      toast.success('Check scheduled!', { description })
      
      // Redirect to the new check
      router.push(`/checks/${data.check.id}`)
    } catch (error: any) {
      toast.error('Failed to schedule check', {
        description: error.message
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="p-4 border-b border-surface-700/50">
          <h2 className="font-semibold text-white">Quick Schedule</h2>
          <p className="text-sm text-surface-400 mt-0.5">
            Schedule a new infrastructure check
          </p>
        </div>
        <div className="p-4 space-y-4">
          {/* Client field skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-16 bg-surface-800 rounded animate-pulse" />
            <div className="h-10 w-full bg-surface-800 rounded-lg animate-pulse" />
          </div>
          {/* Date/Time skeleton */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-12 bg-surface-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-surface-800 rounded-lg animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-12 bg-surface-800 rounded animate-pulse" />
              <div className="h-10 w-full bg-surface-800 rounded-lg animate-pulse" />
            </div>
          </div>
          {/* Button skeleton */}
          <div className="h-10 w-full bg-surface-800 rounded-lg animate-pulse mt-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-visible">
      <div className="p-4 border-b border-surface-700/50">
        <h2 className="font-semibold text-white">Quick Schedule</h2>
        <p className="text-sm text-surface-400 mt-0.5">
          Schedule a new infrastructure check
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Client searchable dropdown */}
        <div className="relative z-30">
          <label className="label flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Client
          </label>
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
              placeholder={clients.length === 0 ? 'Loading clients...' : 'Type to search clients...'}
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
                    className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm text-surface-200 transition-colors"
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

        {/* Engineer searchable dropdown */}
        <div className="relative z-20">
          <label className="label flex items-center gap-2">
            <User className="w-4 h-4" />
            Assign to
          </label>
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
              placeholder="Type to search engineers..."
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
                    className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm text-surface-200 transition-colors"
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
        </div>

        {/* Cadence */}
        <div>
          <label className="label flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Cadence
          </label>
          <div className="grid grid-cols-2 gap-2">
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

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <DatePicker
            value={date}
            onChange={setDate}
            label="Date"
            required
            min={new Date().toISOString().split('T')[0]}
          />
          <TimePicker
            value={time}
            onChange={setTime}
            label="Time"
            required
          />
        </div>

        {/* Options */}
        <div className="space-y-3 pt-2">
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

        {/* Submit */}
        <button 
          type="submit" 
          className="btn-primary w-full mt-4"
          disabled={submitting || !clientId}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Scheduling...
            </>
          ) : (
            'Schedule Check'
          )}
        </button>
      </form>
    </div>
  )
}
