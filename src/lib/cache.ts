/**
 * Redis Cache Utility
 * 
 * Uses Upstash Redis for caching clients and team data.
 * 
 * Setup:
 * 1. Create a free Upstash Redis database: https://upstash.com/
 * 2. Add environment variables:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 * 3. Install: npm install @upstash/redis
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client (lazy initialization)
let redis: Redis | null = null

function getRedisClient(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn('Redis not configured - caching disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
    return null
  }

  try {
    redis = new Redis({
      url,
      token,
    })
    return redis
  } catch (error) {
    console.error('Failed to initialize Redis:', error)
    return null
  }
}

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  // Clients
  clients: (params: string) => `clients:${params}`,
  client: (id: string) => `client:${id}`,
  userClients: (userId: string, params: string) => `user:${userId}:clients:${params}`,
  teamClients: (userId: string) => `team:${userId}:clients`,
  
  // Team
  team: () => 'team:all',
  teamStats: (userId: string) => `team:stats:${userId}`,
  
  // Users
  users: () => 'users:all',
  user: (id: string) => `user:${id}`,
} as const

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  clients: 300,      // 5 minutes
  client: 600,       // 10 minutes
  team: 300,         // 5 minutes
  users: 600,        // 10 minutes
  default: 300,      // 5 minutes
} as const

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const value = await client.get<T>(key)
    return value
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error)
    return null
  }
}

/**
 * Set cached value
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.default
): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.setex(key, ttl, value)
    return true
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error)
    return false
  }
}

/**
 * Delete cached value(s)
 */
export async function deleteCache(...keys: string[]): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.del(...keys)
    return true
  } catch (error) {
    console.error(`Cache delete error for keys ${keys.join(', ')}:`, error)
    return false
  }
}

/**
 * Invalidate all client-related cache
 */
export async function invalidateClientCache(clientId?: string): Promise<void> {
  const client = getRedisClient()
  if (!client) return

  try {
    // Delete specific client cache
    if (clientId) {
      await deleteCache(CACHE_KEYS.client(clientId))
    }

    // Delete all clients list caches (pattern matching would be better, but Upstash REST API doesn't support it directly)
    // For now, we'll rely on TTL expiration or manual invalidation
    // In production, you might want to maintain a set of cache keys to invalidate
  } catch (error) {
    console.error('Error invalidating client cache:', error)
  }
}

/**
 * Invalidate all team-related cache
 */
export async function invalidateTeamCache(): Promise<void> {
  await deleteCache(CACHE_KEYS.team())
}

/**
 * Invalidate all user-related cache
 */
export async function invalidateUserCache(userId?: string): Promise<void> {
  if (userId) {
    await deleteCache(CACHE_KEYS.user(userId), CACHE_KEYS.teamClients(userId))
  } else {
    await deleteCache(CACHE_KEYS.users())
  }
}

/**
 * Generate cache key from query parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${String(params[key])}`)
    .join('&')
  return `${prefix}:${sortedParams || 'default'}`
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.default
): Promise<T> {
  // If Redis is not configured, just execute the fetcher directly
  const client = getRedisClient()
  if (!client) {
    return await fetcher()
  }

  // Try to get from cache first
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // If not in cache, fetch and cache
  const data = await fetcher()
  await setCache(key, data, ttl)
  return data
}
