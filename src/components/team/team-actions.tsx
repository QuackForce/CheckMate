'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { SiNotion, SiSlack } from 'react-icons/si'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function TeamActions() {
  const [syncing, setSyncing] = useState(false)
  const [syncingSlack, setSyncingSlack] = useState(false)

  const handleSyncNotion = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/users/sync-notion', {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }
      const result = await res.json()
      toast.success('Notion sync complete', {
        description: `${result.linked} linked, ${result.created} created, ${result.skipped} skipped`,
      })
      // Refresh the page to show updated data
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to sync from Notion', { description: err.message })
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncSlack = async () => {
    setSyncingSlack(true)
    try {
      const res = await fetch('/api/slack/sync-usernames', {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || data.message || 'Failed to sync Slack usernames')
      }
      const result = await res.json()
      toast.success('Slack username sync complete', {
        description: `${result.results.updated} updated, ${result.results.matched} matched, ${result.results.notFound} not found in Slack`,
      })
      // Refresh the page to show updated data
      window.location.reload()
    } catch (err: any) {
      toast.error('Failed to sync Slack usernames', { description: err.message })
    } finally {
      setSyncingSlack(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSyncNotion}
        disabled={syncing}
        className="btn-secondary flex items-center gap-2"
      >
        <SiNotion className={cn("w-4 h-4", syncing && "animate-spin")} />
        Sync Notion
      </button>
      
      <button
        onClick={handleSyncSlack}
        disabled={syncingSlack}
        className="btn-secondary flex items-center gap-2"
      >
        <SiSlack className={cn("w-4 h-4", syncingSlack && "animate-spin")} />
        Sync Slack
      </button>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2 text-sm text-surface-500">
        <Link2 className="w-4 h-4" />
        <span>Users are synced from your Notion Team Members database</span>
      </div>
    </div>
  )
}

