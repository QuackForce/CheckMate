'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'all', label: 'All Checks', count: 47 },
  { id: 'overdue', label: 'Overdue', count: 3, alert: true },
  { id: 'today', label: 'Today', count: 2 },
  { id: 'upcoming', label: 'Upcoming', count: 12 },
  { id: 'completed', label: 'Completed', count: 30 },
]

export function ChecksTabs() {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="flex items-center gap-1 p-1 bg-surface-800/50 rounded-xl w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-surface-700 text-white shadow-sm'
              : 'text-surface-400 hover:text-surface-200'
          )}
        >
          {tab.label}
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs',
              activeTab === tab.id
                ? tab.alert
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-brand-500/20 text-brand-400'
                : 'bg-surface-600 text-surface-400'
            )}
          >
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}


