'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  Save,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  User,
} from 'lucide-react'
import { SiGooglecalendar } from 'react-icons/si'
import { cn, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'

interface AccessReviewExecutionProps {
  review: any // Using any to handle Prisma types with relations
  onSaveStateChange?: (state: {
    hasUnsavedChanges: boolean
    saving: boolean
    isCompleted: boolean
    handleSave: () => Promise<void>
    handleComplete: () => Promise<void>
    setShowCompleteModal: (show: boolean) => void
  }) => void
}

interface User {
  id: string
  name: string | null
  email: string | null
}

export function AccessReviewExecution({ review: initialReview, onSaveStateChange }: AccessReviewExecutionProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [review, setReview] = useState(initialReview)
  const [evidenceUrl, setEvidenceUrl] = useState(review.evidenceUrl || '')
  const [notes, setNotes] = useState(review.notes || '')
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [autoSchedule, setAutoSchedule] = useState(review.autoSchedule)
  const [assignedToId, setAssignedToId] = useState(review.assignedToId || '')
  const [users, setUsers] = useState<User[]>([])
  
  // Track original values for unsaved changes detection
  const originalValuesRef = useRef({
    evidenceUrl: review.evidenceUrl || '',
    notes: review.notes || '',
    assignedToId: review.assignedToId || '',
  })
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = 
      evidenceUrl !== originalValuesRef.current.evidenceUrl ||
      notes !== originalValuesRef.current.notes ||
      assignedToId !== originalValuesRef.current.assignedToId
    setHasUnsavedChanges(hasChanges)
  }, [evidenceUrl, notes, assignedToId])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=200')
      if (res.ok) {
        const data = await res.json()
        const usersList = data.users || data || []
        setUsers(usersList.filter((u: User) => u.name || u.email))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchReview = async () => {
    try {
      const res = await fetch(`/api/access-reviews/${review.id}`)
      if (res.ok) {
        const data = await res.json()
        setReview(data)
        setEvidenceUrl(data.evidenceUrl || '')
        setNotes(data.notes || '')
        setAutoSchedule(data.autoSchedule)
        setAssignedToId(data.assignedToId || '')
      }
    } catch (error) {
      console.error('Error fetching review:', error)
    }
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/access-reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceUrl: evidenceUrl || null,
          notes: notes || null,
          assignedToId: assignedToId || null,
          status: review.status === 'SCHEDULED' ? 'IN_PROGRESS' : review.status,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Update original values to reflect saved state
        originalValuesRef.current.evidenceUrl = evidenceUrl
        originalValuesRef.current.notes = notes
        originalValuesRef.current.assignedToId = assignedToId
        setHasUnsavedChanges(false)
        toast.success('Review saved', {
          description: 'Your changes have been saved',
        })
        fetchReview()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save review')
      }
    } catch (error) {
      console.error('Error saving review:', error)
      toast.error('Failed to save review')
    } finally {
      setSaving(false)
    }
  }, [review.id, review.status, evidenceUrl, notes, assignedToId])

  const handleComplete = useCallback(async () => {
    setCompleting(true)
    try {
      // Save any unsaved changes first
      if (hasUnsavedChanges) {
        await handleSave()
      }
      
      const res = await fetch(`/api/access-reviews/${review.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceUrl: evidenceUrl || null,
          notes: notes || null,
          autoSchedule,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Review completed!')
        setShowCompleteModal(false)
        
        // If next review was auto-scheduled, show message
        if (data.nextReview) {
          toast.success('Next review has been auto-scheduled')
        }
        
        // Redirect back to compliance page
        router.push('/compliance?type=reviews')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to complete review')
      }
    } catch (error) {
      console.error('Error completing review:', error)
      toast.error('Failed to complete review')
    } finally {
      setCompleting(false)
    }
  }, [review.id, hasUnsavedChanges, handleSave, evidenceUrl, notes, autoSchedule, router])

  // Expose handlers and state for header component
  const isCompleted = review.status === 'COMPLETED'

  // Expose handlers to parent via callback
  // Debounce updates to avoid too many re-renders on every keystroke
  useEffect(() => {
    if (!onSaveStateChange) return
    
    const timer = setTimeout(() => {
      onSaveStateChange({
        hasUnsavedChanges,
        saving,
        isCompleted,
        handleSave,
        handleComplete,
        setShowCompleteModal,
      })
    }, 150) // Small debounce to avoid too many updates while typing
    
    return () => clearTimeout(timer)
  }, [hasUnsavedChanges, saving, isCompleted, onSaveStateChange, handleSave, handleComplete])

  const isOverdue = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(review.dueDate)
    due.setHours(0, 0, 0, 0)
    return due < today && review.status !== 'COMPLETED'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Review Form */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Review Details</h3>

        <div className="space-y-4">
          {review.status !== 'COMPLETED' && (
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Assigned To
              </label>
              <Combobox
                value={assignedToId}
                onChange={setAssignedToId}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...users.map(user => ({
                    value: user.id,
                    label: user.name || user.email || 'Unknown',
                  }))
                ]}
                placeholder="Select a user to assign..."
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-white mb-2 block">
              Evidence URL
            </label>
            <Input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://docs.google.com/..."
              className="w-full bg-surface-800 border-surface-700 text-white placeholder:text-surface-500"
            />
            {evidenceUrl && (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 mt-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Link
              </a>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-white mb-2 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this access review..."
              rows={6}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      

      {/* Completion Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Complete Access Review</h3>
            <p className="text-surface-400 mb-4">
              Are you sure you want to mark this review as completed?
            </p>
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSchedule}
                  onChange={(e) => setAutoSchedule(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-surface-300">
                  Auto-schedule next review
                </span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowCompleteModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completing}
                className="btn-primary flex-1"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  'Complete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

