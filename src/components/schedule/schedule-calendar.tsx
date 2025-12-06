'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

interface ScheduledCheck {
  id: string
  scheduledDate: string
  status: string
  calendarEventLink?: string | null
  client: {
    id: string
    name: string
  }
}

export function ScheduleCalendar() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [checks, setChecks] = useState<ScheduledCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [reschedulingCheck, setReschedulingCheck] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  useEffect(() => {
    fetchChecks()
  }, [year, month])

  const fetchChecks = async () => {
    setLoading(true)
    try {
      // Fetch checks for the current month
      const startDate = new Date(year, month, 1).toISOString()
      const endDate = new Date(year, month + 1, 0).toISOString()
      
      const res = await fetch(`/api/checks?startDate=${startDate}&endDate=${endDate}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setChecks(data.checks || [])
      }
    } catch (error) {
      console.error('Error fetching checks:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startingDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()
  
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }
  
  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleCheckClick = (check: ScheduledCheck, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/checks/${check.id}`)
  }

  const handleReschedule = async (checkId: string) => {
    if (!newDate) return

    try {
      // Combine date and time into a datetime string
      const dateTime = new Date(`${newDate}T${newTime}:00`)
      
      const res = await fetch(`/api/checks/${checkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: dateTime.toISOString() }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reschedule')
      }

      const data = await res.json()
      
      if (data.calendarEvent) {
        toast.success('Check rescheduled and calendar event updated!')
      } else if (data.calendarUpdateError) {
        toast.warning('Check rescheduled, but calendar event failed', {
          description: data.calendarUpdateError,
        })
      } else {
        toast.success('Check rescheduled!')
      }

      setReschedulingCheck(null)
      setNewDate('')
      setNewTime('09:00')
      fetchChecks()
    } catch (error: any) {
      toast.error('Failed to reschedule', {
        description: error.message,
      })
    }
  }

  const openRescheduleModal = (check: ScheduledCheck, e: React.MouseEvent) => {
    e.stopPropagation()
    setReschedulingCheck(check.id)
    const checkDate = new Date(check.scheduledDate)
    // Format date in local timezone (YYYY-MM-DD)
    const year = checkDate.getFullYear()
    const month = String(checkDate.getMonth() + 1).padStart(2, '0')
    const day = String(checkDate.getDate()).padStart(2, '0')
    setNewDate(`${year}-${month}-${day}`)
    // Format time in local timezone (HH:MM)
    const hours = String(checkDate.getHours()).padStart(2, '0')
    const minutes = String(checkDate.getMinutes()).padStart(2, '0')
    setNewTime(`${hours}:${minutes}`)
  }
  
  // Get checks for a specific day
  const getChecksForDay = (day: number) => {
    const date = new Date(year, month, day)
    return checks.filter((check) => {
      const checkDate = new Date(check.scheduledDate)
      return checkDate.toDateString() === date.toDateString()
    })
  }
  
  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }
  
  // Generate calendar days
  const days = []
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-28 bg-surface-900/30" />)
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayChecks = getChecksForDay(day)
    const today = isToday(day)
    const hasOverdue = dayChecks.some((c) => c.status === 'OVERDUE')
    
    days.push(
      <div
        key={day}
        className={cn(
          'h-28 p-2 border-t border-surface-700/50 transition-colors hover:bg-surface-800/50',
          today && 'bg-brand-500/5',
          hasOverdue && 'bg-red-500/5'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={cn(
              'text-sm font-medium',
              today
                ? 'w-7 h-7 bg-brand-500 text-white rounded-full flex items-center justify-center'
                : 'text-surface-300'
            )}
          >
            {day}
          </span>
        </div>
        <div className="space-y-1 overflow-hidden">
          {dayChecks.slice(0, 3).map((check, idx) => (
            <div
              key={check.id || idx}
              className={cn(
                'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors group relative flex items-center gap-1',
                check.status === 'OVERDUE' && 'bg-red-500/20 text-red-400 hover:bg-red-500/30',
                check.status === 'IN_PROGRESS' && 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30',
                check.status === 'SCHEDULED' && 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30',
                check.status === 'COMPLETED' && 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
              )}
              title={`${check.client.name} - Click to open, Right-click to reschedule`}
            >
              <span
                onClick={(e) => handleCheckClick(check, e)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openRescheduleModal(check, e)
                }}
                className="flex-1 truncate"
              >
                {check.client.name}
              </span>
              {check.calendarEventLink && (
                <a
                  href={check.calendarEventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                  title="Open in Google Calendar"
                >
                  <Calendar className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
          {dayChecks.length > 3 && (
            <div className="text-xs text-surface-500 px-1.5">
              +{dayChecks.length - 3} more
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">{monthName}</h2>
          <button
            onClick={goToToday}
            className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />}
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-surface-400" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-surface-400" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-surface-700/50 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-surface-400">Overdue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-surface-400">In Progress</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-blue-500/20 rounded" />
          <span className="text-surface-400">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-surface-400">Completed</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Weekday headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs font-medium text-surface-500 uppercase tracking-wider bg-surface-800/50"
          >
            {day}
          </div>
        ))}
        {days}
      </div>

      {/* Reschedule Modal */}
      {reschedulingCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Reschedule Check
              </h2>
              <button
                onClick={() => {
                  setReschedulingCheck(null)
                  setNewDate('')
                  setNewTime('09:00')
                }}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  value={newDate}
                  onChange={setNewDate}
                  label="New Date"
                  min={new Date().toISOString().split('T')[0]}
                />
                <TimePicker
                  value={newTime}
                  onChange={setNewTime}
                  label="Time"
                />
              </div>
              <p className="text-xs text-surface-500 -mt-2">
                If you have Google Calendar connected, the event will be updated automatically.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleReschedule(reschedulingCheck)}
                  disabled={!newDate}
                  className="flex-1 btn-primary"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => {
                    setReschedulingCheck(null)
                    setNewDate('')
                    setNewTime('09:00')
                  }}
                  className="px-4 py-2 text-sm font-medium text-surface-400 hover:text-surface-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
