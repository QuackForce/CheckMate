/**
 * TrustLists Integration
 * Fetches trust center URLs from trustlists.org API
 */

interface TrustCenter {
  name: string
  website: string
  trustCenter: string
  platform: string
  iconUrl: string
}

interface TrustListsResponse {
  data: TrustCenter[]
  meta: {
    total: number
    generated: string
    version: string
  }
}

// Cache the trust centers data (refreshed every 7 days)
let trustCentersCache: TrustCenter[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Fetch all trust centers from TrustLists API
 */
async function fetchTrustCenters(): Promise<TrustCenter[]> {
  // Return cached data if fresh
  if (trustCentersCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return trustCentersCache
  }

  try {
    const response = await fetch('https://trustlists.org/api/trust-centers.json', {
      next: { revalidate: 604800 } // Cache for 7 days
    })

    if (!response.ok) {
      throw new Error('Failed to fetch trust centers')
    }

    const data: TrustListsResponse = await response.json()
    trustCentersCache = data.data
    cacheTimestamp = Date.now()
    
    return trustCentersCache
  } catch (error) {
    console.error('TrustLists API error:', error)
    return trustCentersCache || []
  }
}

/**
 * Clean a domain for comparison
 */
function cleanDomain(url: string | null): string | null {
  if (!url) return null
  
  return url
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .trim()
}

/**
 * Look up trust center by website domain
 */
export async function lookupTrustCenter(websiteUrl: string | null): Promise<{
  found: boolean
  trustCenterUrl: string | null
  platform: string | null
  companyName: string | null
}> {
  if (!websiteUrl) {
    return { found: false, trustCenterUrl: null, platform: null, companyName: null }
  }

  const trustCenters = await fetchTrustCenters()
  const cleanedInput = cleanDomain(websiteUrl)

  if (!cleanedInput) {
    return { found: false, trustCenterUrl: null, platform: null, companyName: null }
  }

  // Try to find a match by domain
  const match = trustCenters.find(tc => {
    const tcDomain = cleanDomain(tc.website)
    return tcDomain === cleanedInput
  })

  if (match) {
    return {
      found: true,
      trustCenterUrl: match.trustCenter,
      platform: match.platform,
      companyName: match.name,
    }
  }

  return { found: false, trustCenterUrl: null, platform: null, companyName: null }
}

/**
 * Look up trust center by company name (fuzzy match)
 */
export async function lookupTrustCenterByName(companyName: string | null): Promise<{
  found: boolean
  trustCenterUrl: string | null
  platform: string | null
  matchedName: string | null
}> {
  if (!companyName) {
    return { found: false, trustCenterUrl: null, platform: null, matchedName: null }
  }

  const trustCenters = await fetchTrustCenters()
  const cleanedName = companyName.toLowerCase().trim()

  // Try exact match first
  let match = trustCenters.find(tc => 
    tc.name.toLowerCase().trim() === cleanedName
  )

  // Try contains match
  if (!match) {
    match = trustCenters.find(tc => 
      tc.name.toLowerCase().includes(cleanedName) ||
      cleanedName.includes(tc.name.toLowerCase())
    )
  }

  if (match) {
    return {
      found: true,
      trustCenterUrl: match.trustCenter,
      platform: match.platform,
      matchedName: match.name,
    }
  }

  return { found: false, trustCenterUrl: null, platform: null, matchedName: null }
}

/**
 * Get all available trust centers (for browsing/searching)
 */
export async function getAllTrustCenters(): Promise<TrustCenter[]> {
  return fetchTrustCenters()
}

