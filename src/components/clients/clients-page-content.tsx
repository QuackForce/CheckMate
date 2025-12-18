'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ClientsTableWrapper } from './clients-table-wrapper'
import { ClientsFilters } from './clients-filters'
import { ClientsStats } from './clients-stats'

export function ClientsPageContent() {
  const searchParams = useSearchParams()
  const assigneeParam = searchParams.get('assignee')
  const [myClientsOnly, setMyClientsOnly] = useState(assigneeParam === 'me')

  // Sync with URL params
  useEffect(() => {
    setMyClientsOnly(assigneeParam === 'me')
  }, [assigneeParam])

  // Listen for custom events from ClientsTableWrapper when filter changes
  useEffect(() => {
    const handleFilterChange = (e: CustomEvent<boolean>) => {
      setMyClientsOnly(e.detail)
    }

    window.addEventListener('clients-filter-change' as any, handleFilterChange as EventListener)
    return () => {
      window.removeEventListener('clients-filter-change' as any, handleFilterChange as EventListener)
    }
  }, [])

  return (
    <div className="flex-1 px-6 pt-4 pb-4 space-y-4">
      <ClientsStats myClientsOnly={myClientsOnly} />
      <ClientsFilters />
      <ClientsTableWrapper />
    </div>
  )
}

