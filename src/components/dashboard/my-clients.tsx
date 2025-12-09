'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function ClientLogo({ websiteUrl }: { websiteUrl: string | null }) {
  const logoUrl = getLogoUrl(websiteUrl)

  if (!logoUrl) {
    return <Building2 className="w-4 h-4 text-surface-500" />
  }

  return (
    <img
      src={logoUrl}
      alt=""
      className="w-full h-full object-contain"
      loading="lazy"
      onError={(e) => {
        // Replace with fallback icon on error
        e.currentTarget.style.display = 'none'
        const parent = e.currentTarget.parentElement
        if (parent) {
          parent.innerHTML = '<svg class="w-4 h-4 text-surface-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>'
        }
      }}
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
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchClients = async () => {
      try {
        // Fetch preview of 8 clients for display
        const res = await fetch('/api/clients?assignee=me&limit=8')
        if (cancelled) return
        if (res.ok) {
          const json = await res.json()
          setClients(json.clients || [])
          // Use the pagination total if available, otherwise use clients length
          setTotalCount(json.pagination?.total || json.clients?.length || 0)
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
          <p className="text-xs text-surface-500">{totalCount} assigned</p>
        </div>
        <Link href="/clients?assignee=me" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="divide-y divide-surface-700/50 max-h-72 overflow-y-auto">
        {clients.map((client) => {
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-800/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center flex-shrink-0">
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

