'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ChecksListWrapper } from './checks-list-wrapper'
import { ChecksStats } from './checks-stats'

export function ChecksPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const assigneeParam = searchParams.get('assignee')
  const [myClientsOnly, setMyClientsOnly] = useState(assigneeParam === 'me')
  const [statsTotal, setStatsTotal] = useState<number | null>(null)

  // Sync with URL params (same as compliance page)
  useEffect(() => {
    setMyClientsOnly(assigneeParam === 'me')
  }, [assigneeParam])

  const handleMyClientsChange = (value: boolean) => {
    setMyClientsOnly(value)
    // Update URL to match (same as compliance page)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('assignee', 'me')
    } else {
      params.delete('assignee')
    }
    router.push(`/checks?${params.toString()}`)
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      <ChecksStats myClientsOnly={myClientsOnly} onStatsUpdate={setStatsTotal} />
      <ChecksListWrapper 
        myClientsOnly={myClientsOnly} 
        onMyClientsChange={handleMyClientsChange}
        statsTotal={statsTotal}
      />
    </div>
  )
}
