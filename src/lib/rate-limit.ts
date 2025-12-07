/**
 * Simple in-memory rate limiter
 * 
 * Note: In-memory storage resets on serverless cold starts.
 * For production high-security needs, use Redis (Upstash).
 * For internal team tools, this is usually sufficient.
 */

type RateLimitEntry = {
  count: number
  firstRequest: number
}

// Store rate limits in memory
// Key format: "identifier:endpoint"
const rateLimits = new Map<string, RateLimitEntry>()

// Clean up old entries periodically (prevent memory leak)
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
let lastCleanup = Date.now()

function cleanupOldEntries(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  
  lastCleanup = now
  const keys = Array.from(rateLimits.keys())
  keys.forEach(key => {
    const entry = rateLimits.get(key)
    if (entry && now - entry.firstRequest > windowMs * 2) {
      rateLimits.delete(key)
    }
  })
}

export type RateLimitConfig = {
  // Max requests allowed in the window
  limit: number
  // Time window in milliseconds
  windowMs: number
  // Identifier for this limit (e.g., "notion-sync", "dmarc-lookup")
  name: string
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  // Very restrictive - for sensitive operations
  STRICT: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    name: 'strict',
  },
  
  // For sync operations - moderate limits
  SYNC: {
    limit: 20,
    windowMs: 60 * 1000, // 1 minute
    name: 'sync',
  },
  
  // For lookup/query operations
  LOOKUP: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
    name: 'lookup',
  },
  
  // General API - generous limits
  GENERAL: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
    name: 'general',
  },
  
  // Very generous - for high-frequency endpoints
  RELAXED: {
    limit: 200,
    windowMs: 60 * 1000, // 1 minute
    name: 'relaxed',
  },
} as const

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  resetIn: number // milliseconds until reset
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - User ID, email, or IP address
 * @param config - Rate limit configuration
 * @returns Result with success status and limit info
 * 
 * @example
 * // Per-user limiting
 * const result = checkRateLimit(session.user.id, RATE_LIMITS.SYNC)
 * 
 * // Per-IP limiting (for unauthenticated routes)
 * const result = checkRateLimit(request.ip, RATE_LIMITS.STRICT)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs, name } = config
  const key = `${identifier}:${name}`
  const now = Date.now()
  
  // Cleanup old entries periodically
  cleanupOldEntries(windowMs)
  
  const entry = rateLimits.get(key)
  
  // First request or window expired
  if (!entry || now - entry.firstRequest > windowMs) {
    rateLimits.set(key, { count: 1, firstRequest: now })
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetIn: windowMs,
    }
  }
  
  // Within window - check if under limit
  if (entry.count < limit) {
    entry.count++
    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      resetIn: windowMs - (now - entry.firstRequest),
    }
  }
  
  // Rate limited
  return {
    success: false,
    limit,
    remaining: 0,
    resetIn: windowMs - (now - entry.firstRequest),
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  }
}

/**
 * Helper to get identifier from request
 * Prefers user ID (from session) over IP address
 */
export function getIdentifier(
  userId?: string | null,
  request?: { headers: { get: (name: string) => string | null } }
): string {
  if (userId) return `user:${userId}`
  
  if (request) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    return `ip:${ip}`
  }
  
  return 'unknown'
}

/**
 * Reset rate limit for an identifier (e.g., after successful action)
 */
export function resetRateLimit(identifier: string, name: string): void {
  rateLimits.delete(`${identifier}:${name}`)
}

