# Egress Optimization Guide

## Current Issues Causing High Egress

### 1. **Fetching ALL Users on Every Client List Request** ✅ COMPLETED
- **Location**: `src/app/api/clients/route.ts` line 228-258
- **Problem**: Every time someone loads the clients page, it fetches ALL users from the database
- **Impact**: If you have 50 users, that's 50 user records × every client list load = massive egress
- **Fix**: ✅ **IMPLEMENTED** - Only fetches users that are actually assigned to the clients being displayed
- **Savings**: 80-90% reduction (from 50 users to ~5-10 assigned users per page load)

### 2. **Redis Caching Not Configured** ⚠️ HIGH IMPACT
- **Status**: Caching code exists but Redis is not set up
- **Impact**: Every database query hits Supabase directly, no caching
- **Fix**: Set up free Upstash Redis (see below)

### 3. **Fetching ALL Users Endpoint** ⚠️ MEDIUM
- **Location**: `src/app/api/users/route.ts`
- **Problem**: No pagination, fetches all users every time
- **Impact**: Large response size
- **Fix**: Add pagination or limit to active users only

### 4. **Large Includes in Queries**
- **Location**: Multiple API routes
- **Problem**: Fetching related data (engineers, systems, etc.) for every client
- **Impact**: Each client record includes multiple related records
- **Fix**: Use `select` to only fetch needed fields

---

## Immediate Fixes

### Fix 1: Optimize User Fetching in Clients API

**Current Code** (line 214 in `src/app/api/clients/route.ts`):
```typescript
// Fetch all users once (instead of querying for each client - N+1 problem fix)
const allUsers = await db.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
    image: true,
  },
})
```

**Optimized Code**:
```typescript
// Only fetch users that are actually assigned to the clients being displayed
const assignedUserIds = new Set<string>()
allAssignments.forEach((a: any) => {
  if (a.user?.id) assignedUserIds.add(a.user.id)
})
clients.forEach((c: any) => {
  if (c.primaryEngineerId) assignedUserIds.add(c.primaryEngineerId)
  if (c.secondaryEngineerId) assignedUserIds.add(c.secondaryEngineerId)
  if (c.systemEngineerId) assignedUserIds.add(c.systemEngineerId)
  if (c.grceEngineerId) assignedUserIds.add(c.grceEngineerId)
  if (c.itManagerId) assignedUserIds.add(c.itManagerId)
})

// Only fetch users that are actually needed
const allUsers = assignedUserIds.size > 0
  ? await db.user.findMany({
      where: { id: { in: Array.from(assignedUserIds) } },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })
  : []
```

**Savings**: Instead of fetching 50 users every time, only fetch ~5-10 users that are actually assigned.

### Fix 2: Set Up Redis Caching (FREE)

1. **Create Upstash Redis Account**:
   - Go to https://upstash.com/
   - Sign up (free tier: 10K commands/day, 256 MB)
   - Create database in **US West (Oregon)** region
   - Enable eviction with LRU policy

2. **Add Environment Variables**:
   ```bash
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   ```

3. **Add to Vercel**:
   - Go to Vercel project settings → Environment Variables
   - Add both variables

**Expected Savings**: 70-90% reduction in database queries (cached responses don't count as egress)

### Fix 3: Add Pagination to Users API

**Current**: Fetches all users
**Fix**: Add pagination or limit to active users only

---

## Railway vs Supabase Comparison

### Supabase Free Tier
- **Egress**: 5 GB/month (you're at 5.68 GB = overage)
- **Database**: 500 MB storage
- **Pauses**: After 1 week of inactivity
- **Cost**: $0/month (free), $25/month (Pro - no pausing, 8 GB egress)

### Railway
- **Egress**: **100 GB/month included** (20x more than Supabase free)
- **Database**: 5 GB storage (10x more)
- **Pauses**: ❌ No pausing (always-on)
- **Cost**: ~$5-10/month (pay-as-you-go, $5 credit free)
- **Migration**: Easy (PostgreSQL compatible)

### Recommendation: **Move to Railway** ✅

**Why Railway is Better for You:**
1. **20x more egress** (100 GB vs 5 GB) - solves your immediate problem
2. **Always-on** - no cold starts or pausing
3. **Better performance** - dedicated resources
4. **Similar cost** - $5-10/month vs $25/month for Supabase Pro
5. **Easy migration** - Same PostgreSQL, just change connection string

**Migration Steps:**
1. Create Railway account (free $5 credit)
2. Create PostgreSQL database
3. Export Supabase data: `pg_dump`
4. Import to Railway: `psql`
5. Update `DATABASE_URL` in Vercel
6. Test and deploy

**Cost Comparison:**
- **Supabase Pro**: $25/month (8 GB egress, no pausing)
- **Railway**: ~$5-10/month (100 GB egress, always-on, better performance)

---

## Additional Optimizations

### 1. Enable Response Compression
Next.js handles this automatically, but verify in production.

### 2. Reduce Include Fields
Only select fields you actually use:
```typescript
// Instead of:
include: { primaryEngineer: true }

// Use:
include: {
  primaryEngineer: {
    select: { id: true, name: true, email: true }
  }
}
```

### 3. Add Database Indexes
Ensure indexes exist on frequently queried fields:
- `client.status`
- `client.teamAssignments.teamId`
- `user.email`
- `clientEngineerAssignment.userId`

### 4. Monitor Egress
- Set up Supabase alerts for egress usage
- Monitor which queries are using the most data
- Use Supabase dashboard to see query patterns

---

## Quick Wins (Do These First)

1. ✅ **Set up Redis caching** (30 minutes, FREE, 70-90% reduction)
2. ✅ **Optimize user fetching in clients API** (15 minutes, 50-80% reduction)
3. ✅ **Move to Railway** (1-2 hours, 20x more egress, better performance)

---

## Expected Results

After implementing all fixes:
- **Current**: 5.68 GB/month (over limit)
- **With Redis**: ~1-2 GB/month (70% reduction)
- **With optimizations**: ~0.5-1 GB/month (90% reduction)
- **With Railway**: 100 GB limit (no more worries)

---

## Need Help?

- Redis setup: See `docs/REDIS_CACHING_SETUP.md`
- Railway migration: See `docs/DATABASE_MIGRATION.md`
- Code changes: See fixes above

