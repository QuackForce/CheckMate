'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RefreshButton() {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    setMessage(null)
    
    try {
      const res = await fetch('/api/notion/sync', { method: 'POST' })
      const data = await res.json()
      
      if (data.success) {
        setMessage(`✓ ${data.message}`)
        // Reload page to show updated data
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setMessage(`✗ ${data.error}`)
      }
    } catch (error) {
      setMessage('✗ Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span className={cn(
          'text-sm',
          message.startsWith('✓') ? 'text-brand-400' : 'text-red-400'
        )}>
          {message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn-ghost flex items-center gap-2 text-sm"
        title="Sync from Notion"
      >
        <RefreshCw className={cn('w-4 h-4', syncing && 'animate-spin')} />
        {syncing ? 'Syncing...' : 'Sync Notion'}
      </button>
    </div>
  )
}


