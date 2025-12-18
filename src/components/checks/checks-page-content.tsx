'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChecksListWrapper } from './checks-list-wrapper'
import { ChecksStats } from './checks-stats'

export function ChecksPageContent() {
  const searchParams = useSearchParams()
  const assigneeParam = searchParams.get('assignee')
  const [myClientsOnly, setMyClientsOnly] = useState(assigneeParam === 'me')

  // Sync with URL params
  useEffect(() => {
    setMyClientsOnly(assigneeParam === 'me')
  }, [assigneeParam])

  // Listen for custom events from ChecksListWrapper when filter changes
  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<boolean>) => {
      setMyClientsOnly(e.detail)
    }

    window.addEventListener('checks-filter-change' as any, handleFilterChange as EventListener)
    return () => {
      window.removeEventListener('checks-filter-change' as any, handleFilterChange as EventListener)
    }
  }, [])

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <ChecksStats myClientsOnly={myClientsOnly} />
      <ChecksListWrapper />
    </div>
  )
}

