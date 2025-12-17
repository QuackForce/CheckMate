'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, GraduationCap, Loader2, Shield, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface System {
  id: string
  name: string
  category: string
  icon: string | null
  description: string | null
}

interface ClientSystem {
  id: string
  notes: string | null
  system: System
}

interface ClientComplianceProps {
  clientId: string
  initialSystems?: ClientSystem[]
  // Compliance frameworks from Notion (e.g., "SOC2, HIPAA")
  complianceFrameworks?: string[] | null
  // Trust center from TrustLists
  trustCenterUrl?: string | null
  trustCenterPlatform?: string | null
}

export function ClientCompliance({ 
  clientId, 
  initialSystems = [],
  complianceFrameworks,
  trustCenterUrl,
  trustCenterPlatform,
}: ClientComplianceProps) {
  const [systems, setSystems] = useState<ClientSystem[]>(initialSystems)
  const [loading, setLoading] = useState(!initialSystems.length)

  useEffect(() => {
    if (initialSystems.length === 0) {
      fetchSystems()
    }
  }, [clientId])

  const fetchSystems = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/systems`)
      if (res.ok) {
        const data = await res.json()
        // Normalize the data: API returns System (capitalized), component expects system (lowercase)
        const normalized = data.map((item: any) => ({
          ...item,
          system: item.System || item.system, // Handle both cases
        }))
        setSystems(normalized)
      }
    } catch (error) {
      console.error('Failed to fetch systems:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter for GRC and Security Training systems only
  const grcSystem = systems.find(s => s.system?.category === 'GRC')
  const securityTrainingSystem = systems.find(s => s.system?.category === 'SECURITY_TRAINING')

  if (loading) {
    return (
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compliance</h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-surface-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Compliance</h2>
      
      {/* GRC, Security Training, and Frameworks - Inline */}
      <div className="flex gap-8">
        {/* GRC Tool */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
            <p className="text-xs text-surface-500 uppercase tracking-wide">GRC Platform</p>
          </div>
          {grcSystem ? (
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              )}>
                {grcSystem.system?.name || 'GRC'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-surface-400">—</p>
          )}
        </div>

        {/* Security Training */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
            <p className="text-xs text-surface-500 uppercase tracking-wide">Security Training</p>
          </div>
          {securityTrainingSystem ? (
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                "bg-violet-500/20 text-violet-400 border border-violet-500/30"
              )}>
                {securityTrainingSystem.system?.name || 'Security Training'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-surface-400">—</p>
          )}
        </div>

        {/* Compliance Frameworks */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <p className="text-xs text-surface-500 uppercase tracking-wide">Frameworks</p>
          </div>
          {complianceFrameworks && complianceFrameworks.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {complianceFrameworks.map((framework) => (
                <span 
                  key={framework}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                    "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  )}
                >
                  {framework}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-surface-400">—</p>
          )}
        </div>

        {/* Trust Center */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <p className="text-xs text-surface-500 uppercase tracking-wide">Trust Center</p>
          </div>
          {trustCenterUrl ? (
            <a 
              href={trustCenterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
                "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
                "hover:bg-cyan-500/30 transition-colors"
              )}
            >
              {trustCenterPlatform || 'View'}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-xs text-surface-400">—</p>
          )}
        </div>
      </div>
    </div>
  )
}

