'use client'

import { useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { AccessReviewExecution } from '@/components/access-reviews/access-review-execution'
import { AccessReviewHeaderActions } from '@/components/access-reviews/access-review-header-actions'

interface AccessReviewPageClientProps {
  review: any
  subtitle: string
}

export function AccessReviewPageClient({ review, subtitle }: AccessReviewPageClientProps) {
  const [saveState, setSaveState] = useState<{
    hasUnsavedChanges: boolean
    saving: boolean
    isCompleted: boolean
    handleSave: () => Promise<void>
    handleComplete: () => Promise<void>
    setShowCompleteModal: (show: boolean) => void
  } | null>(null)

  // Stabilize the callback to prevent unnecessary re-renders
  const handleSaveStateChange = useCallback((state: {
    hasUnsavedChanges: boolean
    saving: boolean
    isCompleted: boolean
    handleSave: () => Promise<void>
    handleComplete: () => Promise<void>
    setShowCompleteModal: (show: boolean) => void
  }) => {
    setSaveState(state)
  }, [])

  return (
    <>
      <Header 
        title={`Access Review - ${review.Client.name}`}
        subtitle={subtitle}
        backHref="/compliance?type=reviews"
        extraAction={
          <AccessReviewHeaderActions
            reviewId={review.id}
            clientId={review.Client.id}
            hasUnsavedChanges={saveState?.hasUnsavedChanges || false}
            saving={saveState?.saving || false}
            isCompleted={saveState?.isCompleted || false}
            onSave={saveState?.handleSave}
            onComplete={saveState?.handleComplete}
            onShowCompleteModal={saveState?.setShowCompleteModal}
          />
        }
      />
      <div className="flex-1 p-6">
        <AccessReviewExecution review={review} onSaveStateChange={handleSaveStateChange} />
      </div>
    </>
  )
}

