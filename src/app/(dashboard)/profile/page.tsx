'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Bell, MessageSquare, Calendar, Loader2, CheckCircle2, User, Mail, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'

interface UserPreferences {
  timezone: string
  notifySlackReminders: boolean
  notifyOverdueChecks: boolean
  notifyWeeklySummary: boolean
  slackUsername: string | null
  slackUserId: string | null
}

const TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', description: 'UTC-8' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', description: 'UTC-7' },
  { value: 'America/Chicago', label: 'Central Time (CT)', description: 'UTC-6' },
  { value: 'America/New_York', label: 'Eastern Time (ET)', description: 'UTC-5' },
  { value: 'America/Phoenix', label: 'Arizona (MST)', description: 'UTC-7' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)', description: 'UTC-10' },
  { value: 'America/Anchorage', label: 'Alaska (AKST)', description: 'UTC-9' },
  { value: 'UTC', label: 'UTC', description: 'Coordinated Universal Time' },
]

export default function ProfilePreferencesPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState<UserPreferences>({
    timezone: 'America/Los_Angeles',
    notifySlackReminders: true,
    notifyOverdueChecks: true,
    notifyWeeklySummary: false,
    slackUsername: null,
    slackUserId: null,
  })
  const [savingTimezone, setSavingTimezone] = useState(false)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/users/me/preferences')
      if (res.ok) {
        const data = await res.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: keyof UserPreferences) => {
    if (typeof preferences[key] !== 'boolean') return

    const newValue = !preferences[key]
    setPreferences(prev => ({ ...prev, [key]: newValue }))

    try {
      const res = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      })

      if (!res.ok) {
        // Revert on failure
        setPreferences(prev => ({ ...prev, [key]: !newValue }))
        toast.error('Failed to save preference')
      }
    } catch (error) {
      setPreferences(prev => ({ ...prev, [key]: !newValue }))
      toast.error('Failed to save preference')
    }
  }

  const handleTimezoneChange = async (newTimezone: string) => {
    const oldTimezone = preferences.timezone
    setPreferences(prev => ({ ...prev, timezone: newTimezone }))
    setSavingTimezone(true)

    try {
      const res = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: newTimezone }),
      })

      if (res.ok) {
        toast.success('Timezone updated')
      } else {
        setPreferences(prev => ({ ...prev, timezone: oldTimezone }))
        toast.error('Failed to save timezone')
      }
    } catch (error) {
      setPreferences(prev => ({ ...prev, timezone: oldTimezone }))
      toast.error('Failed to save timezone')
    } finally {
      setSavingTimezone(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <div className="card">
        <div className="p-4 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-500/20">
              <User className="w-5 h-5 text-brand-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Account</h3>
              <p className="text-sm text-surface-400">Your account information</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-surface-500" />
            <span className="text-sm text-surface-400">Name:</span>
            <span className="text-sm text-white">{session?.user?.name || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-surface-500" />
            <span className="text-sm text-surface-400">Email:</span>
            <span className="text-sm text-white">{session?.user?.email || 'Not set'}</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-surface-500" />
            <span className="text-sm text-surface-400">Slack:</span>
            {preferences.slackUserId ? (
              <span className="text-sm text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Connected ({preferences.slackUsername || preferences.slackUserId})
              </span>
            ) : (
              <span className="text-sm text-yellow-400">Not connected</span>
            )}
          </div>
        </div>
      </div>

      {/* Timezone Settings */}
      <div className="card">
        <div className="p-4 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Globe className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Timezone</h3>
              <p className="text-sm text-surface-400">
                Used for Slack notifications and date displays
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Your timezone</p>
              <p className="text-xs text-surface-500">
                Dates in Slack reminders will be shown in this timezone
              </p>
            </div>
            <div className="w-64 relative">
              <Combobox
                options={TIMEZONES}
                value={preferences.timezone}
                onChange={handleTimezoneChange}
                placeholder="Select timezone..."
                disabled={savingTimezone}
                searchable={true}
              />
              {savingTimezone && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="card">
        <div className="p-4 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Bell className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Notification Preferences</h3>
              <p className="text-sm text-surface-400">
                Control what notifications you receive
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-surface-700/50">
          {/* Slack Reminders */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Slack reminders for my checks
                </p>
                <p className="text-xs text-surface-500">
                  Receive DM reminders when your assigned checks are due
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifySlackReminders')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.notifySlackReminders ? 'bg-brand-500' : 'bg-surface-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${preferences.notifySlackReminders ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Overdue Check Reminders */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Reminders for overdue checks
                </p>
                <p className="text-xs text-surface-500">
                  Get notified when your checks become overdue
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('notifyOverdueChecks')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${preferences.notifyOverdueChecks ? 'bg-brand-500' : 'bg-surface-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${preferences.notifyOverdueChecks ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Weekly Summary */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-surface-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Weekly summary
                </p>
                <p className="text-xs text-surface-500">
                  Get a weekly overview of your upcoming checks
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-surface-500 bg-surface-700 px-2 py-0.5 rounded">
                Coming Soon
              </span>
              <button
                disabled
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-surface-700 opacity-50 cursor-not-allowed"
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-surface-500 translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      {!preferences.slackUserId && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-400 mb-1">Slack not connected</h4>
          <p className="text-sm text-surface-400">
            To receive Slack notifications, ask an admin to sync Slack usernames from 
            Settings → Integrations, or manually set your Slack ID in the Team page.
          </p>
        </div>
      )}
    </div>
  )
}


