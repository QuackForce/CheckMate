/**
 * DNS Security Lookup Service
 * Uses Google's public DNS-over-HTTPS API to look up DMARC, SPF, and DKIM records
 */

// ============================================
// Types
// ============================================

export interface DMARCResult {
  found: boolean
  policy: 'none' | 'quarantine' | 'reject' | null
  rawRecord: string | null
  error?: string
}

export interface SPFResult {
  found: boolean
  policy: 'pass' | 'softfail' | 'hardfail' | 'neutral' | null
  rawRecord: string | null
  error?: string
}

export interface DKIMResult {
  found: boolean
  selector: string | null
  rawRecord: string | null
  error?: string
}

// ============================================
// Helper Functions
// ============================================

function cleanDomain(domain: string): string {
  return domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()
}

async function dnsLookup(name: string): Promise<any> {
  const response = await fetch(
    `https://dns.google/resolve?name=${name}&type=TXT`,
    { 
      headers: { 'Accept': 'application/dns-json' },
      next: { revalidate: 3600 } // Cache for 1 hour
    }
  )
  
  if (!response.ok) {
    throw new Error('DNS lookup failed')
  }
  
  return response.json()
}

// ============================================
// DMARC Lookup
// ============================================

export async function lookupDMARC(domain: string): Promise<DMARCResult> {
  const clean = cleanDomain(domain)

  try {
    const data = await dnsLookup(`_dmarc.${clean}`)

    if (!data.Answer || data.Answer.length === 0) {
      return { found: false, policy: null, rawRecord: null }
    }

    for (const answer of data.Answer) {
      const record = answer.data?.replace(/"/g, '') || ''
      
      if (record.toLowerCase().startsWith('v=dmarc1')) {
        const policyMatch = record.match(/;\s*p\s*=\s*(none|quarantine|reject)/i)
        const policy = policyMatch 
          ? policyMatch[1].toLowerCase() as 'none' | 'quarantine' | 'reject'
          : null

        return { found: true, policy, rawRecord: record }
      }
    }

    return { found: false, policy: null, rawRecord: null }
  } catch (error: any) {
    console.error('DMARC lookup error:', error)
    return { found: false, policy: null, rawRecord: null, error: error.message }
  }
}

// ============================================
// SPF Lookup
// ============================================

export async function lookupSPF(domain: string): Promise<SPFResult> {
  const clean = cleanDomain(domain)

  try {
    const data = await dnsLookup(clean)

    if (!data.Answer || data.Answer.length === 0) {
      return { found: false, policy: null, rawRecord: null }
    }

    for (const answer of data.Answer) {
      const record = answer.data?.replace(/"/g, '') || ''
      
      if (record.toLowerCase().startsWith('v=spf1')) {
        // Determine the policy based on the "all" mechanism
        let policy: SPFResult['policy'] = null
        
        if (record.includes('-all')) {
          policy = 'hardfail' // Strict - reject unauthorized
        } else if (record.includes('~all')) {
          policy = 'softfail' // Soft fail - mark as suspicious
        } else if (record.includes('?all')) {
          policy = 'neutral' // Neutral - no policy
        } else if (record.includes('+all')) {
          policy = 'pass' // Allow all (dangerous!)
        }

        return { found: true, policy, rawRecord: record }
      }
    }

    return { found: false, policy: null, rawRecord: null }
  } catch (error: any) {
    console.error('SPF lookup error:', error)
    return { found: false, policy: null, rawRecord: null, error: error.message }
  }
}

// ============================================
// DKIM Lookup
// ============================================

// Common DKIM selectors used by popular email providers
const COMMON_SELECTORS = [
  'google', 'selector1', 'selector2', // Microsoft 365
  'k1', 'k2', 'k3', // Mailchimp
  'default', 'dkim', 'mail',
  's1', 's2', 'sig1',
  'smtp', 'email', 'mx'
]

export async function lookupDKIM(domain: string, customSelector?: string): Promise<DKIMResult> {
  const clean = cleanDomain(domain)
  
  // If a custom selector is provided, try it first
  const selectorsToTry = customSelector 
    ? [customSelector, ...COMMON_SELECTORS.filter(s => s !== customSelector)]
    : COMMON_SELECTORS

  for (const selector of selectorsToTry) {
    try {
      const data = await dnsLookup(`${selector}._domainkey.${clean}`)

      if (data.Answer && data.Answer.length > 0) {
        for (const answer of data.Answer) {
          const record = answer.data?.replace(/"/g, '') || ''
          
          // Check if it's a valid DKIM record (contains v=DKIM1 or p= for public key)
          if (record.toLowerCase().includes('v=dkim1') || record.includes('p=')) {
            return { found: true, selector, rawRecord: record }
          }
        }
      }
    } catch (error) {
      // Continue to next selector
      continue
    }
  }

  return { found: false, selector: null, rawRecord: null }
}

/**
 * Get a human-readable DMARC status
 */
export function getDMARCStatus(policy: string | null): {
  label: string
  color: string
  description: string
} {
  switch (policy?.toLowerCase()) {
    case 'reject':
      return {
        label: 'Reject',
        color: 'text-green-400 bg-green-500/20',
        description: 'Strongest protection - unauthorized emails are rejected'
      }
    case 'quarantine':
      return {
        label: 'Quarantine', 
        color: 'text-yellow-400 bg-yellow-500/20',
        description: 'Medium protection - unauthorized emails go to spam'
      }
    case 'none':
      return {
        label: 'None',
        color: 'text-orange-400 bg-orange-500/20', 
        description: 'Monitoring only - no action taken on unauthorized emails'
      }
    default:
      return {
        label: 'Not Set',
        color: 'text-red-400 bg-red-500/20',
        description: 'No DMARC record found - vulnerable to email spoofing'
      }
  }
}


