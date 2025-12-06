/**
 * DMARC Lookup Service
 * Uses Google's public DNS-over-HTTPS API to look up DMARC records
 */

export interface DMARCResult {
  found: boolean
  policy: 'none' | 'quarantine' | 'reject' | null
  rawRecord: string | null
  error?: string
}

/**
 * Look up DMARC record for a domain
 */
export async function lookupDMARC(domain: string): Promise<DMARCResult> {
  // Clean up domain
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()

  try {
    // Use Google's DNS-over-HTTPS API
    const response = await fetch(
      `https://dns.google/resolve?name=_dmarc.${cleanDomain}&type=TXT`,
      { 
        headers: { 'Accept': 'application/dns-json' },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    )

    if (!response.ok) {
      return { found: false, policy: null, rawRecord: null, error: 'DNS lookup failed' }
    }

    const data = await response.json()

    // Check if we got an answer
    if (!data.Answer || data.Answer.length === 0) {
      return { found: false, policy: null, rawRecord: null }
    }

    // Find the DMARC record (TXT record starting with v=DMARC1)
    for (const answer of data.Answer) {
      const record = answer.data?.replace(/"/g, '') || ''
      
      if (record.toLowerCase().startsWith('v=dmarc1')) {
        // Extract the policy
        const policyMatch = record.match(/;\s*p\s*=\s*(none|quarantine|reject)/i)
        const policy = policyMatch 
          ? policyMatch[1].toLowerCase() as 'none' | 'quarantine' | 'reject'
          : null

        return {
          found: true,
          policy,
          rawRecord: record,
        }
      }
    }

    return { found: false, policy: null, rawRecord: null }
  } catch (error: any) {
    console.error('DMARC lookup error:', error)
    return { found: false, policy: null, rawRecord: null, error: error.message }
  }
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


