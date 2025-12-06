'use client'

import { useState } from 'react'
import { Shield, RefreshCw, Check, AlertTriangle, X, Info, Lock, Mail, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface SecurityChecksProps {
  clientId: string
  domain: string | null
  // DMARC
  dmarcValue: string | null
  dmarcRecord: string | null
  dmarcLastChecked: Date | null
  // SPF
  spfValue: string | null
  spfRecord: string | null
  spfLastChecked: Date | null
  // DKIM
  dkimValue: string | null
  dkimSelector: string | null
  dkimRecord: string | null
  dkimLastChecked: Date | null
  // SSL
  sslStatus: string | null
  sslIssuer: string | null
  sslExpiry: Date | null
  sslLastChecked: Date | null
}

type CheckType = 'dmarc' | 'spf' | 'dkim' | 'ssl'

interface CheckStatus {
  icon: typeof Check
  color: string
  bg: string
  label: string
}

export function SecurityChecks({
  clientId,
  domain,
  dmarcValue,
  dmarcRecord,
  dmarcLastChecked,
  spfValue,
  spfRecord,
  spfLastChecked,
  dkimValue,
  dkimSelector,
  dkimRecord,
  dkimLastChecked,
  sslStatus,
  sslIssuer,
  sslExpiry,
  sslLastChecked,
}: SecurityChecksProps) {
  const [loading, setLoading] = useState<CheckType | 'all' | null>(null)
  const router = useRouter()

  const runCheck = async (checkType: CheckType | 'all') => {
    if (!domain) return
    
    setLoading(checkType)
    try {
      const res = await fetch(`/api/clients/${clientId}/security`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, checkType }),
      })
      
      if (res.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Security check failed:', error)
    } finally {
      setLoading(null)
    }
  }

  // Status helpers
  const getDMARCStatus = (value: string | null): CheckStatus | null => {
    switch (value?.toLowerCase()) {
      case 'reject':
        return { icon: Check, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Reject' }
      case 'quarantine':
        return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Quarantine' }
      case 'none':
        return { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'None' }
      case 'not set':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Not Set' }
      default:
        return null
    }
  }

  const getSPFStatus = (value: string | null): CheckStatus | null => {
    switch (value?.toLowerCase()) {
      case 'hardfail':
        return { icon: Check, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Hard Fail (-all)' }
      case 'softfail':
        return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Soft Fail (~all)' }
      case 'neutral':
        return { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/20', label: 'Neutral (?all)' }
      case 'pass':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Pass All (+all)' }
      case 'not set':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Not Set' }
      default:
        return null
    }
  }

  const getDKIMStatus = (value: string | null): CheckStatus | null => {
    switch (value?.toLowerCase()) {
      case 'found':
        return { icon: Check, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Found' }
      case 'not found':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Not Found' }
      default:
        return null
    }
  }

  const getSSLStatus = (value: string | null): CheckStatus | null => {
    switch (value?.toLowerCase()) {
      case 'valid':
        return { icon: Check, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Valid' }
      case 'expiring_soon':
        return { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Expiring Soon' }
      case 'expired':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Expired' }
      case 'invalid':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Invalid' }
      case 'not found':
        return { icon: X, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Not Found' }
      default:
        return null
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString()
  }

  const dmarcStatus = getDMARCStatus(dmarcValue)
  const spfStatus = getSPFStatus(spfValue)
  const dkimStatus = getDKIMStatus(dkimValue)
  const sslStatusValue = getSSLStatus(sslStatus)

  const SecurityCheckItem = ({
    label,
    icon: Icon,
    status,
    record,
    lastChecked,
    checkType,
    extraInfo,
    tooltipPosition = 'left',
  }: {
    label: string
    icon: typeof Shield
    status: CheckStatus | null
    record: string | null
    lastChecked: Date | null
    checkType: CheckType
    extraInfo?: string
    tooltipPosition?: 'left' | 'right'
  }) => {
    const isLoading = loading === checkType || loading === 'all'
    const hasTooltipContent = record || extraInfo || lastChecked
    
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-3.5 h-3.5 text-surface-400" />
          <p className="text-xs text-surface-500 uppercase tracking-wide">{label}</p>
          {domain && (
            <button
              onClick={() => runCheck(checkType)}
              disabled={loading === 'all'}
              className="text-brand-400 hover:text-brand-300 disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
            </button>
          )}
        </div>
        
        {status ? (
          <div className="flex items-center gap-2">
            <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs", status.bg, status.color)}>
              <status.icon className="w-3 h-3" />
              {status.label}
            </div>
            
            {hasTooltipContent && (
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-surface-500 hover:text-surface-300 cursor-help" />
                <div className={cn(
                  "absolute bottom-full mb-2 w-64 p-3 bg-surface-800 border border-surface-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]",
                  tooltipPosition === 'right' ? 'right-0' : 'left-0'
                )}>
                  {extraInfo && (
                    <p className="text-xs text-surface-300 mb-2">{extraInfo}</p>
                  )}
                  {record && (
                    <>
                      <p className="text-xs text-surface-400 mb-1">Full Record:</p>
                      <p className="text-xs text-surface-200 font-mono break-all">
                        {record}
                      </p>
                    </>
                  )}
                  {lastChecked && (
                    <p className="text-xs text-surface-500 mt-2">
                      Last checked: {formatDate(lastChecked)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-surface-400">—</p>
        )}
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Security Checks</h2>
        {domain && (
          <button
            onClick={() => runCheck('all')}
            disabled={loading === 'all'}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading === 'all' && "animate-spin")} />
            {loading === 'all' ? 'Checking...' : 'Run All'}
          </button>
        )}
      </div>

      {!domain ? (
        <p className="text-surface-400 text-sm">No domain configured for this client.</p>
      ) : (
        <div className="flex gap-6">
          <SecurityCheckItem
            label="DMARC"
            icon={Mail}
            status={dmarcStatus}
            record={dmarcRecord}
            lastChecked={dmarcLastChecked}
            checkType="dmarc"
          />
          <SecurityCheckItem
            label="SPF"
            icon={Mail}
            status={spfStatus}
            record={spfRecord}
            lastChecked={spfLastChecked}
            checkType="spf"
          />
          <SecurityCheckItem
            label="DKIM"
            icon={Key}
            status={dkimStatus}
            record={dkimRecord}
            lastChecked={dkimLastChecked}
            checkType="dkim"
            extraInfo={dkimSelector ? `Selector: ${dkimSelector}` : undefined}
          />
          <SecurityCheckItem
            label="SSL"
            icon={Lock}
            status={sslStatusValue}
            record={null}
            lastChecked={sslLastChecked}
            checkType="ssl"
            tooltipPosition="right"
            extraInfo={
              sslExpiry 
                ? `Certificate expires: ${formatDate(sslExpiry)}` 
                : sslStatus === 'valid' 
                  ? 'HTTPS connection verified' 
                  : undefined
            }
          />
        </div>
      )}
    </div>
  )
}

