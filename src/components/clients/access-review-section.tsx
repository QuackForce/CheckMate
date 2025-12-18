'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Users, 
  Calendar, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'

interface AccessReview {
  id: string
  framework?: string | null
  reviewDate: string
  dueDate: string
  cadence: string
  customDays?: number | null
  status: string
  assignedToId?: string | null
  completedById?: string | null
  completedAt?: string | null
  evidenceUrl?: string | null
  notes?: string | null
  totalTimeSeconds: number
  autoSchedule: boolean
  AssignedTo?: { id: string; name: string | null; email: string | null } | null
  CompletedBy?: { id: string; name: string | null; email: string | null } | null
}

interface AccessReviewSectionProps {
  clientId: string
}

export function AccessReviewSection({ clientId }: AccessReviewSectionProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canManage = userRole === 'IT_ENGINEER' || userRole === 'IT_MANAGER' || userRole === 'ADMIN'

  const [reviews, setReviews] = useState<AccessReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingReview, setEditingReview] = useState<AccessReview | null>(null)
  const [saving, setSaving] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string | null; email: string | null }>>([])

  // Form state
  const [framework, setFramework] = useState('')
  const [reviewDate, setReviewDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [cadence, setCadence] = useState('QUARTERLY')
  const [customDays, setCustomDays] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [autoSchedule, setAutoSchedule] = useState(true)

  useEffect(() => {
    fetchReviews()
    fetchUsers()
  }, [clientId])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/access-reviews`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=200')
      if (res.ok) {
        const data = await res.json()
        const users = data.users || data || []
        setAvailableUsers(users.filter((u: any) => u.name || u.email))
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const calculateDueDate = (reviewDate: string, cadence: string, customDays?: number) => {
    if (!reviewDate) return ''
    const date = new Date(reviewDate)
    
    if (cadence === 'QUARTERLY') {
      date.setMonth(date.getMonth() + 3)
    } else if (cadence === 'SEMI_ANNUAL') {
      date.setMonth(date.getMonth() + 6)
    } else if (cadence === 'ANNUAL') {
      date.setFullYear(date.getFullYear() + 1)
    } else if (cadence === 'CUSTOM' && customDays) {
      date.setDate(date.getDate() + customDays)
    }
    
    // Due date is 7 days after review date
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
  }

  const handleReviewDateChange = (date: string) => {
    setReviewDate(date)
    if (date && cadence) {
      const due = calculateDueDate(date, cadence, customDays ? parseInt(customDays) : undefined)
      setDueDate(due)
    }
  }

  const handleCadenceChange = (newCadence: string) => {
    setCadence(newCadence)
    if (reviewDate && newCadence) {
      const due = calculateDueDate(reviewDate, newCadence, newCadence === 'CUSTOM' && customDays ? parseInt(customDays) : undefined)
      setDueDate(due)
    }
  }

  const resetForm = () => {
    setFramework('')
    setReviewDate('')
    setDueDate('')
    setCadence('QUARTERLY')
    setCustomDays('')
    setAssignedToId('')
    setAutoSchedule(true)
    setEditingReview(null)
  }

  const openAddModal = () => {
    resetForm()
    // Set default review date to today
    const today = new Date().toISOString().split('T')[0]
    setReviewDate(today)
    const due = calculateDueDate(today, 'QUARTERLY')
    setDueDate(due)
    setShowAddModal(true)
  }

  const openEditModal = (review: AccessReview) => {
    setFramework(review.framework || '')
    setReviewDate(new Date(review.reviewDate).toISOString().split('T')[0])
    setDueDate(new Date(review.dueDate).toISOString().split('T')[0])
    setCadence(review.cadence)
    setCustomDays(review.customDays?.toString() || '')
    setAssignedToId(review.assignedToId || '')
    setAutoSchedule(review.autoSchedule)
    setEditingReview(review)
    setShowAddModal(true)
  }

  const handleSubmit = async () => {
    if (!reviewDate || !dueDate || !cadence) {
      toast.error('Please fill in all required fields')
      return
    }

    if (cadence === 'CUSTOM' && !customDays) {
      toast.error('Please specify custom days')
      return
    }

    setSaving(true)
    try {
      const url = editingReview
        ? `/api/access-reviews/${editingReview.id}`
        : `/api/clients/${clientId}/access-reviews`

      const method = editingReview ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework: framework || null,
          reviewDate,
          dueDate,
          cadence,
          customDays: cadence === 'CUSTOM' ? parseInt(customDays) : null,
          assignedToId: assignedToId || null,
          autoSchedule,
        }),
      })

      if (res.ok) {
        toast.success(editingReview ? 'Access review updated' : 'Access review scheduled')
        setShowAddModal(false)
        resetForm()
        fetchReviews()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save access review')
      }
    } catch (error) {
      console.error('Error saving review:', error)
      toast.error('Failed to save access review')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this access review?')) return

    try {
      const res = await fetch(`/api/access-reviews/${reviewId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Access review deleted')
        fetchReviews()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete access review')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      toast.error('Failed to delete access review')
    }
  }

  const getStatusInfo = (review: AccessReview) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(review.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (review.status === 'COMPLETED') {
      return { label: 'Completed', color: 'text-brand-400', icon: CheckCircle2 }
    }
    if (review.status === 'IN_PROGRESS') {
      return { label: 'In Progress', color: 'text-amber-400', icon: Play }
    }
    if (daysUntilDue < 0) {
      return { label: 'Overdue', color: 'text-red-400', icon: AlertTriangle }
    }
    if (daysUntilDue <= 14) {
      return { label: `Due in ${daysUntilDue} days`, color: 'text-amber-400', icon: AlertTriangle }
    }
    return { label: 'Scheduled', color: 'text-blue-400', icon: Calendar }
  }

  const frameworkOptions = [
    { value: '', label: 'General (No Framework)' },
    { value: 'SOC2', label: 'SOC 2' },
    { value: 'ISO27001', label: 'ISO 27001' },
    { value: 'HIPAA', label: 'HIPAA' },
  ]

  const cadenceOptions = [
    { value: 'QUARTERLY', label: 'Quarterly' },
    { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
    { value: 'ANNUAL', label: 'Annual' },
    { value: 'CUSTOM', label: 'Custom' },
  ]

  const userOptions = availableUsers.map(user => ({
    value: user.id,
    label: user.name || user.email || 'Unknown',
  }))

  // Separate reviews into upcoming and completed
  const upcomingReviews = reviews.filter(r => r.status !== 'COMPLETED').sort((a, b) => 
    new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime()
  )
  const completedReviews = reviews.filter(r => r.status === 'COMPLETED').sort((a, b) => 
    new Date(b.completedAt || b.reviewDate).getTime() - new Date(a.completedAt || a.reviewDate).getTime()
  ).slice(0, 5) // Show last 5 completed

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Access Reviews</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-surface-500" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Access Reviews</h3>
          {canManage && (
            <Button onClick={openAddModal} size="sm" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Review
            </Button>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-surface-400 text-sm">No access reviews scheduled yet</p>
        ) : (
          <div className="space-y-4">
            {/* Upcoming Reviews */}
            {upcomingReviews.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-3">Upcoming</h4>
                <div className="space-y-3">
                  {upcomingReviews.map((review) => {
                    const statusInfo = getStatusInfo(review)
                    const StatusIcon = statusInfo.icon

                    return (
                      <div
                        key={review.id}
                        className="p-4 bg-surface-800 rounded-lg border border-surface-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-violet-400" />
                              <span className="font-medium text-white">
                                {review.framework ? `${review.framework} - ` : ''}
                                {formatDate(new Date(review.reviewDate))}
                              </span>
                              <span className={cn('text-xs px-2 py-0.5 rounded', statusInfo.color, 'bg-surface-700')}>
                                <StatusIcon className="w-3 h-3 inline mr-1" />
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-surface-400">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Due: {formatDate(new Date(review.dueDate))}</span>
                              </div>
                              {review.AssignedTo && (
                                <div>
                                  <span>Assigned: {review.AssignedTo.name || review.AssignedTo.email}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <Link
                                href={`/clients/${clientId}/access-reviews/${review.id}`}
                                className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
                              >
                                {review.status === 'SCHEDULED' ? 'Start Review' : 'Continue Review'}
                              </Link>
                            </div>
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(review)}
                                className="p-2 text-surface-400 hover:text-white transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(review.id)}
                                className="p-2 text-surface-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completed Reviews */}
            {completedReviews.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-surface-300 mb-3">Recent</h4>
                <div className="space-y-2">
                  {completedReviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-3 bg-surface-800/50 rounded-lg border border-surface-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                            <span className="text-sm text-white">
                              {review.framework ? `${review.framework} - ` : ''}
                              {formatDate(new Date(review.reviewDate))}
                            </span>
                            {review.CompletedBy && (
                              <span className="text-xs text-surface-500">
                                by {review.CompletedBy.name || review.CompletedBy.email}
                              </span>
                            )}
                          </div>
                          {review.evidenceUrl && (
                            <div className="mt-1">
                              <a
                                href={review.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Evidence
                              </a>
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/clients/${clientId}/access-reviews/${review.id}`}
                          className="text-xs text-surface-400 hover:text-surface-300"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Sheet open={showAddModal} onOpenChange={setShowAddModal}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingReview ? 'Edit Access Review' : 'Schedule Access Review'}
            </SheetTitle>
            <SheetDescription>
              Schedule a new access review for this client
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Framework (Optional)
              </label>
              <Combobox
                value={framework}
                onChange={setFramework}
                options={frameworkOptions}
                placeholder="Select framework..."
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Review Date *
              </label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => handleReviewDateChange(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Cadence *
              </label>
              <Combobox
                value={cadence}
                onChange={handleCadenceChange}
                options={cadenceOptions}
                placeholder="Select cadence..."
                className="w-full"
              />
            </div>

            {cadence === 'CUSTOM' && (
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Custom Days *
                </label>
                <Input
                  type="number"
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value)
                    if (reviewDate) {
                      const due = calculateDueDate(reviewDate, 'CUSTOM', parseInt(e.target.value))
                      setDueDate(due)
                    }
                  }}
                  min="1"
                  placeholder="Number of days"
                  className="w-full"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Due Date *
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Assign To
              </label>
              <Combobox
                value={assignedToId}
                onChange={setAssignedToId}
                options={userOptions}
                placeholder="Select user..."
                searchable
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSchedule"
                checked={autoSchedule}
                onChange={(e) => setAutoSchedule(e.target.checked)}
                className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="autoSchedule" className="text-sm text-surface-300">
                Auto-schedule next review after completion
              </label>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingReview ? 'Update' : 'Schedule'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}

