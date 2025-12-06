'use client'

import { useState } from 'react'
import { Shield, RefreshCw, Check, AlertTriangle, X, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface DMARCCheckerProps {
  clientId: string
  domain: string | null
  currentValue: string | null
  currentRecord: string | null
  lastChecked: Date | null
}

interface DMARCResult {
  found: boolean
  policy: 'none' | 'quarantine' | 'reject' | null
  rawRecord: string | null
  error?: string
  saved?: boolean
}

export function DMARCChecker({ clientId, domain, currentValue, currentRecord, lastChecked }: DMARCCheckerProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DMARCResult | null>(null)
  const router = useRouter()

  const checkDMARC = async () => {
    if (!domain) return
    
    setLoading(true)
    try {
      // Call the API that saves the result
      const res = await fetch(`/api/clients/${clientId}/dmarc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      setResult(data)
      
      // Refresh the page to show updated data
      if (data.saved) {
        router.refresh()
      }
    } catch (error) {
      setResult({ found: false, policy: null, rawRecord: null, error: 'Lookup failed' })
    } finally {
      setLoading(false)
    }
  }

  const getPolicyStyle = (policy: string | null | undefined) => {
    switch (policy?.toLowerCase()) {
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

  // Use result if we just checked, otherwise use stored value
  const displayPolicy = result?.policy || currentValue
  const displayRecord = result?.rawRecord || currentRecord
  const style = getPolicyStyle(displayPolicy)

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-surface-500 uppercase tracking-wide">DMARC</p>
        {domain && (
          <button
            onClick={checkDMARC}
            disabled={loading}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 disabled:opacity-50"
          >
            {currentValue ? (
              <>
                <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
                {loading ? 'Checking...' : 'Refresh'}
              </>
            ) : (
              <>
                <Shield className={cn("w-3 h-3", loading && "animate-pulse")} />
                {loading ? 'Checking...' : 'Check Live'}
              </>
            )}
          </button>
        )}
      </div>
      
      {style ? (
        <div className="flex items-center gap-2">
          <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm", style.bg, style.color)}>
            <style.icon className="w-3.5 h-3.5" />
            {style.label}
          </div>
          
          {/* Info tooltip with full record */}
          {displayRecord && (
            <div className="relative group">
              <Info className="w-4 h-4 text-surface-500 hover:text-surface-300 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-surface-800 border border-surface-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <p className="text-xs text-surface-400 mb-1">Full DMARC Record:</p>
                <p className="text-xs text-surface-200 font-mono break-all">
                  {displayRecord}
                </p>
                {lastChecked && (
                  <p className="text-xs text-surface-500 mt-2">
                    Last checked: {new Date(lastChecked).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-surface-200">{currentValue || '—'}</p>
      )}
    </div>
  )
}

