# Database Migration Options

> **Status:** Documented for future consideration  
> **Last Updated:** December 2024  
> **Current Setup:** PostgreSQL on Neon/Supabase (free tier) + Vercel hosting

---

## Current Performance Issues

The free database tier causes **cold starts** (database sleeps after ~5 minutes of inactivity), resulting in slow page loads:

| Route | Current FCP | Expected After Fix |
|-------|-------------|-------------------|
| /dashboard | 4.34s | ~1.5s |
| /checks/[id] | 3.07s | ~1.2s |
| /team | 3.06s | ~1.2s |
| /schedule | 2.2s | ~1.0s |
| /checks | 2.83s | ~1.2s |
| /login | 1.06s | ~0.8s |
| /clients | 1.19s | ~0.9s |

---

## Recommended Solution: Railway Database

### Why Railway?

- **No cold starts** - Database is always on
- **$5/month** - Affordable for a business tool
- **PostgreSQL** - Same as current, no code changes needed
- **Simple migration** - Just change DATABASE_URL
- **Great dashboard** - Easy monitoring and management

### Migration Steps

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create PostgreSQL Database**
   - Click "New Project" → "Provision PostgreSQL"
   - Copy the `DATABASE_URL` from the Variables tab

3. **Migrate Data**
   ```bash
   # Export from current database
   pg_dump $OLD_DATABASE_URL > backup.sql
   
   # Import to Railway
   psql $RAILWAY_DATABASE_URL < backup.sql
   ```

4. **Update Vercel Environment**
   - Go to Vercel → Project Settings → Environment Variables
   - Update `DATABASE_URL` with Railway URL
   - Redeploy

5. **Run Prisma Migrations**
   ```bash
   npx prisma migrate deploy
   ```

6. **Verify**
   - Test all pages load correctly
   - Check database connections in Railway dashboard

### Estimated Time: 15-30 minutes

---

## Alternative Options

### Option 1: Keep-Warm Pings (Free)

Set up a cron job to ping the app every 4 minutes to prevent cold starts.

**Pros:** Free  
**Cons:** Still occasional slow loads, uses function quota

To implement:
1. Use [cron-job.org](https://cron-job.org) (free)
2. Set up ping to `https://check-mate-six.vercel.app/api/health`
3. Run every 4 minutes

### Option 2: CockroachDB Serverless (Free)

- No cold starts on free tier
- PostgreSQL compatible
- 10 GB storage, 50M request units/month

**Migration:** Similar to Railway, but requires updating some Prisma settings for CockroachDB compatibility.

### Option 3: Upgrade Current Provider

- **Neon Pro:** $19/month - Always-on compute
- **Supabase Pro:** $25/month - No pausing

---

## Database Comparison

| Provider | Free Tier | Paid | Cold Starts | Notes |
|----------|-----------|------|-------------|-------|
| **Neon** | 0.5 GB, sleeps 5 min | $19/mo | ⚠️ Yes | Current provider? |
| **Supabase** | 500 MB, pauses 1 week | $25/mo | ⚠️ Yes | |
| **Railway** | $5 credit/mo | ~$5/mo | ✅ No | **Recommended** |
| **CockroachDB** | 10 GB | Pay-as-you-go | ✅ No | Free + no cold starts |
| **Render** | 256 MB | $7/mo | ✅ No | Simple |
| **PlanetScale** | ❌ Removed | $29/mo | ✅ No | MySQL only |

---

## Current Caching

The app has **in-memory caching** for:
- Notion configuration
- Integration settings (Slack, Harvest, etc.)
- Team member/vendor names during sync

**Limitation:** Cache is lost on every serverless cold start, making it ineffective on Vercel's free tier.

### Future Caching Options

If needed, consider:
- **Vercel KV** (Redis) - $0.50/100K requests
- **Upstash Redis** - Free tier available
- **Next.js `unstable_cache`** - Built-in, uses Vercel's cache

---

## Decision Checklist

Before migrating, verify:

- [ ] Current database performance is actually a problem for users
- [ ] Team is comfortable with $5/month cost
- [ ] Backup of current database exists
- [ ] Migration tested in development first
- [ ] Rollback plan documented

---

## Quick Commands

```bash
# Check current database URL
echo $DATABASE_URL

# Test database connection
npx prisma db pull

# Create database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Run migrations on new database
DATABASE_URL=$NEW_URL npx prisma migrate deploy
```


