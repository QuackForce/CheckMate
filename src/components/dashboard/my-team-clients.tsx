'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Briefcase, Building2, Loader2, Shield, Users, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  image: string | null
}

interface Client {
  id: string
  name: string
  websiteUrl: string | null
  status: string
  systemEngineer?: TeamMember | null
  grceEngineer?: TeamMember | null
  primaryEngineer?: TeamMember | null
  secondaryEngineer?: TeamMember | null
}

interface TeamClientsData {
  managerType: string | null
  team: string | null
  teamMemberCount: number
  teamMembers: TeamMember[]
  clientCount: number
  clients: Client[]
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

const managerConfig = {
  'SE Manager': {
    icon: Wrench,
    color: 'text-brand-400',
    bgColor: 'bg-brand-500/20',
    label: 'System Engineers',
  },
  'GRC Manager': {
    icon: Shield,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'GRC Engineers',
  },
  'IT Manager': {
    icon: Briefcase,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    label: 'Consultants',
  },
}

export function MyTeamClients() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TeamClientsData | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchTeamClients = async () => {
      try {
        const res = await fetch('/api/users/me/team-clients')
        if (cancelled) return
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setData(json)
        }
      } catch (error) {
        if (!cancelled) console.error('Failed to fetch team clients:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchTeamClients()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data?.managerType) return null

  const config = managerConfig[data.managerType as keyof typeof managerConfig]
  const Icon = config?.icon || Users

  return (
    <div className="card">
      <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config?.bgColor || 'bg-surface-700')}>
            <Icon className={cn('w-5 h-5', config?.color || 'text-surface-400')} />
          </div>
          <div>
            <h3 className="font-semibold text-white">My Team's Clients</h3>
            <p className="text-xs text-surface-500">
              {data.teamMemberCount} {config?.label || 'team members'} • {data.clientCount} clients
            </p>
          </div>
        </div>
        <Link
          href={(() => {
            if (data.managerType === 'SE Manager') return '/clients?managerTeam=se'
            if (data.managerType === 'GRC Manager') return '/clients?managerTeam=grc'
            if (data.managerType === 'IT Manager' && data.team) {
              const teamNum = data.team.match(/\d+/)?.[0] || ''
              return `/clients?managerTeam=consultant-team-${teamNum}`
            }
            return '/clients'
          })()}
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {data.teamMembers.length > 0 && (
        <div className="p-3 border-b border-surface-700/50 bg-surface-800/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-500">Team:</span>
            <div className="flex -space-x-2">
              {data.teamMembers.slice(0, 6).map((member) => (
                <div
                  key={member.id}
                  className="w-6 h-6 rounded-full bg-surface-600 border-2 border-surface-800 flex items-center justify-center overflow-hidden"
                  title={member.name}
                >
                  {member.image ? (
                    <img src={member.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-surface-400">{member.name.charAt(0)}</span>
                  )}
                </div>
              ))}
              {data.teamMemberCount > 6 && (
                <div className="w-6 h-6 rounded-full bg-surface-700 border-2 border-surface-800 flex items-center justify-center">
                  <span className="text-[10px] text-surface-400">+{data.teamMemberCount - 6}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-surface-700/50 max-h-80 overflow-y-auto">
        {data.clients.slice(0, 8).map((client) => {
          const assignee = client.systemEngineer || client.grceEngineer || client.primaryEngineer
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="flex items-center gap-3 p-3 hover:bg-surface-800/50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                <ClientLogo websiteUrl={client.websiteUrl} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{client.name}</p>
                {assignee && <p className="text-xs text-surface-500 truncate">{assignee.name}</p>}
              </div>

              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  client.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-surface-700 text-surface-400'
                )}
              >
                {client.status}
              </span>
            </Link>
          )
        })}

        {data.clients.length === 0 && (
          <div className="p-4 text-center text-surface-500 text-sm">No clients assigned to your team yet</div>
        )}

        {data.clients.length > 8 && (
          <div className="p-3 text-center">
            <Link
              href={(() => {
                if (data.managerType === 'SE Manager') return '/clients?managerTeam=se'
                if (data.managerType === 'GRC Manager') return '/clients?managerTeam=grc'
                if (data.managerType === 'IT Manager' && data.team) {
                  const teamNum = data.team.match(/\d+/)?.[0] || ''
                  return `/clients?managerTeam=consultant-team-${teamNum}`
                }
                return '/clients'
              })()}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              View all {data.clientCount} clients →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

