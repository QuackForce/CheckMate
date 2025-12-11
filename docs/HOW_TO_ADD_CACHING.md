# How to Add Redis Caching to Your Routes

This guide shows you how to add Redis caching to any API route or server component in your application.

## Quick Start Pattern

The simplest way to add caching is using the `withCache` wrapper function:

```typescript
import { withCache, CACHE_KEYS, CACHE_TTL, generateCacheKey } from '@/lib/cache'

export async function GET(request: NextRequest) {
  // 1. Generate a unique cache key
  const cacheKey = CACHE_KEYS.clients('your-unique-identifier')
  
  // 2. Wrap your database query with withCache
  const result = await withCache(
    cacheKey,
    async () => {
      // Your database query here
      const data = await db.client.findMany({ /* ... */ })
      return data
    },
    CACHE_TTL.clients // Cache for 5 minutes
  )
  
  // 3. Return the result
  return NextResponse.json(result)
}
```

---

## Step-by-Step Guide

### Step 1: Import the Cache Utilities

```typescript
import { 
  withCache,           // Main caching wrapper
  CACHE_KEYS,          // Pre-defined cache key helpers
  CACHE_TTL,           // Pre-defined TTL values
  generateCacheKey,    // Helper to create cache keys from params
  invalidateClientCache // Cache invalidation helpers
} from '@/lib/cache'
```

### Step 2: Generate a Cache Key

The cache key must be **unique** for each different query. Use one of these approaches:

#### Option A: Use Pre-defined Keys

```typescript
// For a specific client
const cacheKey = CACHE_KEYS.client(clientId)

// For team clients for a user
const cacheKey = CACHE_KEYS.teamClients(userId)
```

#### Option B: Generate from Query Parameters

```typescript
const cacheKey = CACHE_KEYS.clients(
  generateCacheKey('list', {
    status: status || 'all',
    page: page.toString(),
    limit: limit.toString(),
    userId: session?.user?.id || '',
  })
)
```

**Important**: Include all parameters that affect the result in the cache key!

### Step 3: Wrap Your Database Query

```typescript
const result = await withCache(
  cacheKey,                    // The unique cache key
  async () => {               // Function that fetches data
    // Your database queries here
    const data = await db.client.findMany({ /* ... */ })
    return data
  },
  CACHE_TTL.clients           // How long to cache (in seconds)
)
```

### Step 4: Return the Result

```typescript
return NextResponse.json(result)
```

---

## Complete Examples

### Example 1: Simple GET Route

**Before:**
```typescript
export async function GET(request: NextRequest) {
  const clients = await db.client.findMany({
    where: { status: 'ACTIVE' },
  })
  return NextResponse.json({ clients })
}
```

**After:**
```typescript
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const cacheKey = CACHE_KEYS.clients('active')
  
  const result = await withCache(
    cacheKey,
    async () => {
      const clients = await db.client.findMany({
        where: { status: 'ACTIVE' },
      })
      return { clients }
    },
    CACHE_TTL.clients
  )
  
  return NextResponse.json(result)
}
```

### Example 2: Route with Query Parameters

**Before:**
```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  
  const clients = await db.client.findMany({
    where: { status },
    skip: (page - 1) * 20,
    take: 20,
  })
  
  return NextResponse.json({ clients })
}
```

**After:**
```typescript
import { withCache, CACHE_KEYS, CACHE_TTL, generateCacheKey } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  
  // Generate cache key from all query parameters
  const cacheKey = CACHE_KEYS.clients(
    generateCacheKey('list', {
      status: status || 'all',
      page: page.toString(),
    })
  )
  
  const result = await withCache(
    cacheKey,
    async () => {
      const clients = await db.client.findMany({
        where: { status },
        skip: (page - 1) * 20,
        take: 20,
      })
      return { clients }
    },
    CACHE_TTL.clients
  )
  
  return NextResponse.json(result)
}
```

### Example 3: Server Component (Page)

**Before:**
```typescript
async function getData() {
  const data = await db.user.findMany()
  return data
}

export default async function MyPage() {
  const data = await getData()
  return <div>{/* ... */}</div>
}
```

**After:**
```typescript
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

async function getData() {
  return await withCache(
    CACHE_KEYS.users(),
    async () => {
      const data = await db.user.findMany()
      return data
    },
    CACHE_TTL.users
  )
}

export default async function MyPage() {
  const data = await getData()
  return <div>{/* ... */}</div>
}
```

---

## Cache Invalidation

When data changes, you need to invalidate the cache so users see fresh data.

### When to Invalidate

- **Creating data**: Invalidate list caches
- **Updating data**: Invalidate both the item cache and list caches
- **Deleting data**: Invalidate both the item cache and list caches

### How to Invalidate

```typescript
import { invalidateClientCache, invalidateTeamCache } from '@/lib/cache'

// In a POST/PATCH/DELETE route
export async function POST(request: NextRequest) {
  // Create/update/delete data
  const client = await db.client.create({ /* ... */ })
  
  // Invalidate cache
  await invalidateClientCache() // Invalidates all client caches
  
  return NextResponse.json({ client })
}
```

### Available Invalidation Functions

```typescript
// Invalidate all client caches
await invalidateClientCache()

// Invalidate a specific client
await invalidateClientCache(clientId)

// Invalidate team cache
await invalidateTeamCache()

// Invalidate user cache
await invalidateUserCache(userId)
```

---

## Cache TTL (Time To Live)

Pre-defined TTL values (in seconds):

```typescript
CACHE_TTL.clients = 300  // 5 minutes
CACHE_TTL.client = 600   // 10 minutes (single client)
CACHE_TTL.team = 300     // 5 minutes
CACHE_TTL.users = 600    // 10 minutes
CACHE_TTL.default = 300  // 5 minutes
```

**When to use which:**
- **Short TTL (5 min)**: Frequently changing data (lists, stats)
- **Long TTL (10 min)**: Rarely changing data (user profiles, single items)

---

## Best Practices

### ✅ DO

1. **Include all query parameters in cache key**
   ```typescript
   // Good: Includes all parameters
   generateCacheKey('list', { status, page, limit, userId })
   ```

2. **Use appropriate TTL**
   - Frequently changing: 5 minutes
   - Rarely changing: 10+ minutes

3. **Invalidate on updates**
   ```typescript
   await db.client.update({ /* ... */ })
   await invalidateClientCache() // ✅ Always invalidate
   ```

4. **Handle cache failures gracefully**
   - The `withCache` function automatically falls back to database if cache fails
   - Your code doesn't need to handle cache errors

### ❌ DON'T

1. **Don't cache user-specific sensitive data** (unless it's safe)
2. **Don't use the same cache key for different queries**
3. **Don't forget to invalidate cache on updates**
4. **Don't cache search results** (they're too unique)

---

## Troubleshooting

### Cache not working?

1. **Check environment variables**
   ```bash
   # Make sure these are set
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

2. **Test the cache connection**
   ```bash
   curl https://your-app.vercel.app/api/cache/test
   ```

3. **Check cache keys are unique**
   - Make sure different queries use different keys
   - Log the cache key to verify it's correct

### Cache returning stale data?

1. **Check TTL settings** - Maybe TTL is too long?
2. **Verify cache invalidation** - Are you invalidating on updates?
3. **Check cache key** - Make sure it's unique per query

### Performance not improving?

1. **Check cache hit rate** in Upstash dashboard
2. **Verify queries are actually slow** - Maybe they're already fast?
3. **Check if cache is being used** - Add logging to see cache hits/misses

---

## Quick Reference

```typescript
// Import
import { withCache, CACHE_KEYS, CACHE_TTL, generateCacheKey } from '@/lib/cache'

// Generate key
const key = CACHE_KEYS.clients(generateCacheKey('list', params))

// Cache
const result = await withCache(key, fetcher, CACHE_TTL.clients)

// Invalidate
await invalidateClientCache()
```

---

## Need Help?

- Check existing examples in:
  - `/api/clients/route.ts` - Clients list with caching
  - `/app/(dashboard)/team/page.tsx` - Team page with caching
  - `/api/users/me/team-clients/route.ts` - Team clients with caching

- Test your cache: `/api/cache/test`
