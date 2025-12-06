import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(' ')
}

export function formatTimerDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function getRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === -1) return 'Yesterday'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 14) return 'Next week'
  return formatDate(d)
}

export function getCadenceLabel(cadence: string): string {
  const labels: Record<string, string> = {
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Bi-weekly',
    MONTHLY: 'Monthly',
    BIMONTHLY: 'Bi-monthly',
    QUARTERLY: 'Quarterly',
    ADHOC: 'Ad-hoc',
    CUSTOM: 'Custom',
  }
  return labels[cadence] || cadence
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    CANCELLED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    OVERDUE: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return colors[status] || colors.SCHEDULED
}

export function getClientStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-400',
    INACTIVE: 'bg-gray-500/20 text-gray-400',
    ONBOARDING: 'bg-blue-500/20 text-blue-400',
    OFFBOARDING: 'bg-orange-500/20 text-orange-400',
    ON_HOLD: 'bg-red-500/20 text-red-400',
    EXITING: 'bg-amber-500/20 text-amber-400',
    AS_NEEDED: 'bg-purple-500/20 text-purple-400',
  }
  return colors[status] || colors.ACTIVE
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

