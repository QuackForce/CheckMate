'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function ClientLogo({ websiteUrl }: { websiteUrl: string | null }) {
  const [logoError, setLogoError] = useState(false)
  const logoUrl = getLogoUrl(websiteUrl)

  if (!logoUrl || logoError) {
    return <Building2 className="w-4 h-4 text-surface-500" />
  }

  return (
    <img
      src={logoUrl}
      alt=""
      className="w-6 h-6 object-contain"
      onError={() => setLogoError(true)}
    />
  )
}

interface Client {
  id: string
  name: string
  status: string
  websiteUrl: string | null
}

function getLogoUrl(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null
  try {
    const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`)
    // Use Google's favicon service (more reliable than Clearbit)
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`
  } catch {
    return null
  }
}

export function MyClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients?assignee=me&limit=8')
        if (cancelled) return
        if (res.ok) {
          const json = await res.json()
          setClients(json.clients || [])
        }
      } catch (err) {
        console.error('Failed to load my clients', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchClients()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">My Clients</h3>
          <p className="text-xs text-surface-500">{clients.length} assigned</p>
        </div>
        <Link href="/clients?assignee=me" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-surface-700/50 max-h-72 overflow-y-auto">
        {clients.slice(0, 8).map((client) => {
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-800/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                <ClientLogo websiteUrl={client.websiteUrl} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{client.name}</p>
                <p className="text-xs text-surface-500 truncate">{client.status}</p>
              </div>
            </Link>
          )
        })}

        {clients.length === 0 && (
          <div className="p-4 text-center text-surface-500 text-sm">No clients assigned yet</div>
        )}
      </div>
    </div>
  )
}

