# Redis Caching Setup Guide

This guide explains how to set up Redis caching for clients and team data to speed up your application.

## Why Cache?

- **Faster Response Times**: Redis is in-memory, so cached data returns in milliseconds
- **Reduced Database Load**: Fewer queries to your Supabase PostgreSQL database
- **Lower Costs**: Fewer database operations = lower Supabase usage
- **Better Scalability**: Handle more concurrent users without database bottlenecks

## Setup Steps

### 1. Create Upstash Redis Database

1. Go to [https://upstash.com/](https://upstash.com/)
2. Sign up for a free account
3. Click "Create Database"
4. Choose:
   - **Type**: Redis
   - **Region**: **US West (Oregon)** - To match your Supabase `us-west-2` and Vercel `pdx1`
   - **Plan**: Free tier (10K commands/day, 256 MB storage)
   - **Eviction**: ✅ **Enable** (recommended)
   - **Eviction Policy**: **LRU (Least Recently Used)** - Keeps most frequently accessed data
5. Click "Create"

### 2. Get Your Redis Credentials

After creating the database, you'll see:
- **UPSTASH_REDIS_REST_URL**: Your Redis REST API URL
- **UPSTASH_REDIS_REST_TOKEN**: Your Redis REST API token

### 3. Add Environment Variables

Add these to your `.env.local` file (and Vercel environment variables):

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 4. Install Dependencies

```bash
npm install @upstash/redis
```

**Note**: Already installed! ✅

## Implementation Examples

### Example 1: Caching Clients List

Here's how to add caching to `/api/clients` route:

```typescript
import { withCache, CACHE_KEYS, CACHE_TTL, generateCacheKey, invalidateClientCache } from '@/lib/cache'

export async function GET(request: NextRequest) {
  // ... existing rate limiting code ...
  
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status');
  const team = searchParams.get('team');
  // ... other params ...
  
  // Generate cache key from query parameters
  const cacheKey = CACHE_KEYS.clients(
    generateCacheKey('list', {
      status: status || 'all',
      team: team || 'all',
      priority: priority || 'all',
      search: search || '',
      page,
      limit,
      assignee: assignee || '',
      managerTeam: managerTeam || '',
      userId: session?.user?.id || '',
    })
  )
  
  // Use cache wrapper
  const result = await withCache(
    cacheKey,
    async () => {
      // Your existing database query code here
      const total = await db.client.count({ where });
      const clients = await db.client.findMany({ /* ... */ });
      // ... rest of your logic ...
      
      return {
        clients: clientsWithAssignee,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },
    CACHE_TTL.clients
  );
  
  return NextResponse.json(result);
}
```

### Example 2: Caching Team Data

For `/api/users/me/team-clients`:

```typescript
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cacheKey = CACHE_KEYS.teamClients(session.user.id)
  
  const result = await withCache(
    cacheKey,
    async () => {
      // Your existing database queries here
      const currentUser = await db.user.findUnique({ /* ... */ });
      // ... rest of your logic ...
      
      return {
        managerType,
        team,
        teamMemberCount: teamMembers.length,
        teamMembers: teamMembers.slice(0, 10),
        clientCount: clients.length,
        clients: clients.slice(0, 20),
      };
    },
    CACHE_TTL.team
  );
  
  return NextResponse.json(result);
}
```

### Example 3: Cache Invalidation

When data changes, invalidate the cache:

```typescript
// In POST /api/clients (create client)
export async function POST(request: NextRequest) {
  // ... create client ...
  const client = await db.client.create({ /* ... */ });
  
  // Invalidate cache
  await invalidateClientCache();
  
  return NextResponse.json({ success: true, client });
}

// In PATCH /api/clients/[id] (update client)
export async function PATCH(request: NextRequest, { params }) {
  // ... update client ...
  await db.client.update({ /* ... */ });
  
  // Invalidate specific client and list caches
  await invalidateClientCache(params.id);
  
  return NextResponse.json({ success: true, client });
}
```

## Cache TTL (Time To Live)

Current TTL settings in `src/lib/cache.ts`:
- **Clients list**: 5 minutes (300 seconds)
- **Single client**: 10 minutes (600 seconds)
- **Team data**: 5 minutes (300 seconds)
- **Users**: 10 minutes (600 seconds)

Adjust these based on how frequently your data changes.

## Cache Keys

The cache utility uses structured keys:
- `clients:list:params` - Clients list with filters
- `client:{id}` - Single client
- `team:{userId}:clients` - Team clients for a user
- `team:all` - All team members
- `users:all` - All users

## Monitoring

Upstash provides a dashboard where you can:
- Monitor cache hit/miss rates
- View command usage
- See response times
- Check storage usage

## Cost Considerations

**Free Tier Limits:**
- 10,000 commands per day
- 256 MB storage
- Perfect for development and small production apps

**Paid Plans:**
- Start at $0.20 per 100K commands
- Very affordable for production use

## Best Practices

1. **Cache frequently accessed data**: Clients and team data are perfect candidates
2. **Set appropriate TTLs**: Balance freshness vs. performance
3. **Invalidate on updates**: Always invalidate cache when data changes
4. **Don't cache user-specific sensitive data**: Unless it's safe to share
5. **Monitor cache hit rates**: If hit rate is low, caching may not be worth it

## Troubleshooting

**Cache not working?**
- Check environment variables are set correctly
- Verify Redis credentials in Upstash dashboard
- Check console for Redis connection errors

**Cache returning stale data?**
- Ensure you're invalidating cache on updates
- Check TTL settings aren't too long
- Verify cache keys match between get/set operations

**Out of commands?**
- Check Upstash dashboard for usage
- Consider increasing TTL to reduce cache misses
- Upgrade to paid plan if needed
