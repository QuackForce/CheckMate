import { NextResponse } from 'next/server'
import { getCache, setCache, CACHE_TTL } from '@/lib/cache'

/**
 * Test endpoint to verify Redis cache is working
 * GET /api/cache/test - Test cache read/write
 */
export async function GET() {
  try {
    const testKey = 'cache-test'
    const testValue = { message: 'Hello from Redis!', timestamp: new Date().toISOString() }
    
    // Test 1: Write to cache
    const setResult = await setCache(testKey, testValue, 60) // 60 second TTL
    
    if (!setResult) {
      return NextResponse.json({
        success: false,
        error: 'Failed to write to cache. Check your Redis credentials.',
        hint: 'Make sure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set correctly.'
      }, { status: 500 })
    }
    
    // Test 2: Read from cache
    const cachedValue = await getCache<typeof testValue>(testKey)
    
    if (!cachedValue) {
      return NextResponse.json({
        success: false,
        error: 'Failed to read from cache after writing.',
        hint: 'Cache write succeeded but read failed. Check Redis connection.'
      }, { status: 500 })
    }
    
    // Test 3: Verify data integrity
    if (cachedValue.message !== testValue.message) {
      return NextResponse.json({
        success: false,
        error: 'Cache data mismatch. Data corruption detected.',
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Redis cache is working correctly! ✅',
      test: {
        wrote: setResult,
        read: !!cachedValue,
        data: cachedValue,
      },
      cacheConfig: {
        defaultTTL: CACHE_TTL.default,
        clientsTTL: CACHE_TTL.clients,
        teamTTL: CACHE_TTL.team,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      hint: 'Check your Redis credentials and network connection.'
    }, { status: 500 })
  }
}
