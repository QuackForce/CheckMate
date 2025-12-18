'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, Save, CheckCircle2 } from 'lucide-react'
import { SiGooglecalendar } from 'react-icons/si'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'

interface AccessReviewHeaderActionsProps {
  reviewId: string
  clientId: string
  hasUnsavedChanges?: boolean
  saving?: boolean
  isCompleted?: boolean
  onSave?: () => Promise<void>
  onComplete?: () => Promise<void>
  onShowCompleteModal?: (show: boolean) => void
}

export function AccessReviewHeaderActions({ 
  reviewId, 
  clientId,
  hasUnsavedChanges = false,
  saving = false,
  isCompleted = false,
  onSave,
  onComplete,
  onShowCompleteModal,
}: AccessReviewHeaderActionsProps) {
  const router = useRouter()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/access-reviews/${reviewId}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete review')
      }
      toast.success('Access review deleted')
      router.push('/compliance?type=reviews')
    } catch (error: any) {
      toast.error('Failed to delete review', { description: error.message })
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const handleCompleteClick = async () => {
    if (onComplete) {
      try {
        // Save any unsaved changes first
        if (hasUnsavedChanges && onSave) {
          await onSave()
        }
        // Then show completion modal
        if (onShowCompleteModal) {
          onShowCompleteModal(true)
        }
      } catch (error: any) {
        toast.error('Failed to save review', { description: error.message })
      }
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Save Button - appears when there are unsaved changes (hidden when completed) */}
        {hasUnsavedChanges && !isCompleted && onSave && (
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-all disabled:opacity-70 animate-in fade-in slide-in-from-right-2 duration-200"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}

        {/* Complete Button (hidden when already completed) */}
        {!isCompleted && onComplete && (
          <button
            onClick={handleCompleteClick}
            className="btn-primary"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete
          </button>
        )}

        {/* Calendar Icon - Placeholder */}
        <button
          className="p-2 text-surface-500 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors cursor-not-allowed opacity-50"
          title="Calendar integration coming soon"
          disabled
        >
          <SiGooglecalendar className="w-5 h-5" />
        </button>

        {/* Delete Icon */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete review"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm animate-scale-in">
            <div className="p-5">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white text-center mb-1">
                Delete Access Review
              </h2>
              <p className="text-sm text-surface-400 text-center mb-5">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-70 flex items-center gap-2"
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

