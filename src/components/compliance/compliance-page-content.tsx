'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Shield, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComplianceListWrapper } from './compliance-list-wrapper'
import { ComplianceStats } from './compliance-stats'

export function CompliancePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const assigneeParam = searchParams.get('assignee')
  const typeParam = searchParams.get('type') as 'audits' | 'reviews' | null
  const [myClientsOnly, setMyClientsOnly] = useState(assigneeParam === 'me')
  const [activeType, setActiveType] = useState<'audits' | 'reviews'>(typeParam === 'audits' ? 'audits' : 'reviews')

  // Sync with URL params
  useEffect(() => {
    setMyClientsOnly(assigneeParam === 'me')
    if (typeParam === 'reviews' || typeParam === 'audits') {
      setActiveType(typeParam)
    }
  }, [assigneeParam, typeParam])

  const handleTypeChange = (type: 'audits' | 'reviews') => {
    setActiveType(type)
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', type)
    router.push(`/compliance?${params.toString()}`)
  }

  const handleMyClientsToggle = (value: boolean) => {
    setMyClientsOnly(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('assignee', 'me')
    } else {
      params.delete('assignee')
    }
    router.push(`/compliance?${params.toString()}`)
  }

  return (
    <div className="flex-1 px-4 md:px-6 pt-2 md:pt-4 pb-6 space-y-4 md:space-y-6 overflow-y-auto">
      {/* Type Selector Tabs */}
      <div className="flex gap-2 border-b border-surface-700/50 pb-4">
        <button
          onClick={() => handleTypeChange('reviews')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all border',
            activeType === 'reviews'
              ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
              : 'text-surface-400 hover:text-white hover:bg-surface-800 border-transparent'
          )}
        >
          <FileText className="w-4 h-4" />
          <span className="font-medium">Access Reviews</span>
        </button>
        <button
          onClick={() => handleTypeChange('audits')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all border',
            activeType === 'audits'
              ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
              : 'text-surface-400 hover:text-white hover:bg-surface-800 border-transparent'
          )}
        >
          <Shield className="w-4 h-4" />
          <span className="font-medium">Audits</span>
        </button>
      </div>

      <ComplianceStats myClientsOnly={myClientsOnly} activeType={activeType} />
      <ComplianceListWrapper activeType={activeType} myClientsOnly={myClientsOnly} onMyClientsToggle={handleMyClientsToggle} />
    </div>
  )
}

