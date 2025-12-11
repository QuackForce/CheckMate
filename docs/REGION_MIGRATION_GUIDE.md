# Region Migration Guide - Northern California Users

Since all your users are in Northern California, moving everything to **US West** will significantly improve performance.

## Current Setup
- **Vercel**: `iad1` (Washington, D.C. - US East)
- **Supabase**: Likely US East (check your Supabase dashboard)
- **Upstash**: Should be US East (if already created)

## Target Setup (Recommended)
- **Vercel**: `pdx1` (Portland, Oregon - US West) ✅ **Perfect match for Supabase us-west-2!**
- **Supabase**: us-west-2 (Oregon) ✅ **Already set!**
- **Upstash**: US West (Oregon) ✅

---

## 1. Change Vercel Region ✅ Easy (2 minutes)

### Steps:

1. **Update `vercel.json`**:
   ```json
   {
     "buildCommand": "prisma generate && next build",
     "installCommand": "npm install",
     "framework": "nextjs",
     "regions": ["pdx1"]
   }
   ```
   
   **Note**: `pdx1` is Portland, Oregon - the **same AWS region** as Supabase's `us-west-2`, giving you the lowest possible latency!

2. **Commit and push**:
   ```bash
   git add vercel.json
   git commit -m "Change Vercel region to US West (sfo1) for Northern California users"
   git push
   ```

3. **Vercel will automatically redeploy** with the new region

**That's it!** Your functions will now run in San Francisco, much closer to your users.

---

## 2. Change Supabase Region ⚠️ Requires Migration

**Important**: Supabase **cannot change the region** of an existing project. You need to:
1. Create a new project in the desired region
2. Migrate your data
3. Update environment variables

### Steps:

#### Step 1: Create New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. **Important**: Select **US West** region during creation
4. Choose the same organization
5. Wait for project to be created

#### Step 2: Export Data from Old Project

```bash
# Get your old database URL from Supabase dashboard
OLD_DATABASE_URL="postgresql://postgres:[PASSWORD]@[OLD-PROJECT].supabase.co:5432/postgres"

# Export all data
pg_dump $OLD_DATABASE_URL > supabase_backup_$(date +%Y%m%d).sql
```

Or use Supabase's built-in backup (if available on your plan).

#### Step 3: Import Data to New Project

```bash
# Get your new database URL from new Supabase project
NEW_DATABASE_URL="postgresql://postgres:[PASSWORD]@[NEW-PROJECT].supabase.co:5432/postgres"

# Import data
psql $NEW_DATABASE_URL < supabase_backup_$(date +%Y%m%d).sql
```

#### Step 4: Run Prisma Migrations

```bash
# Update .env.local with new DATABASE_URL
DATABASE_URL=$NEW_DATABASE_URL

# Run migrations to ensure schema is up to date
npx prisma migrate deploy
```

#### Step 5: Update Environment Variables

**In Vercel:**
1. Go to Project Settings → Environment Variables
2. Update `DATABASE_URL` with new Supabase URL
3. Update `DIRECT_URL` if you have one
4. Redeploy

**In Local `.env`:**
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@[NEW-PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[NEW-PROJECT].supabase.co:5432/postgres"
```

#### Step 6: Copy Integration Settings

If you have any Supabase-specific settings (API keys, auth configs), copy them from old project to new project.

#### Step 7: Verify & Test

1. Test all pages load correctly
2. Test authentication
3. Test database queries
4. Check Supabase dashboard for data

#### Step 8: Delete Old Project (Optional)

Once everything is verified and working:
1. Go to old Supabase project settings
2. Delete the project (if you're sure)

---

## 3. Change Upstash Region ✅ Easy (If Already Created)

If you've already created your Upstash Redis database:

### Option A: Create New Database (Recommended)
1. Create a new Upstash Redis database
2. Choose **US West (N. California)** region
3. Update environment variables:
   ```bash
   UPSTASH_REDIS_REST_URL=<new-url>
   UPSTASH_REDIS_REST_TOKEN=<new-token>
   ```
4. Delete old database (optional)

### Option B: Keep Current Database
If you haven't created it yet, just choose **US West (N. California)** when creating.

---

## Performance Impact

### Before (US East):
- Northern California users: ~50-80ms latency
- Database queries: ~50-100ms
- Total page load: Higher latency

### After (US West):
- Northern California users: ~5-15ms latency ⚡
- Database queries: ~10-30ms ⚡
- Total page load: **Much faster!** 🚀

**Expected improvement**: 3-5x faster for your Northern California users!

---

## Migration Checklist

### Vercel Region Change
- [ ] Update `vercel.json` with `"regions": ["sfo1"]`
- [ ] Commit and push changes
- [ ] Verify deployment in Vercel dashboard
- [ ] Test app loads correctly

### Supabase Migration
- [ ] Create new Supabase project in US West
- [ ] Export data from old project
- [ ] Import data to new project
- [ ] Run Prisma migrations
- [ ] Update Vercel environment variables
- [ ] Update local `.env` file
- [ ] Test authentication
- [ ] Test all database operations
- [ ] Verify data integrity
- [ ] Delete old project (optional)

### Upstash Region
- [ ] Create new Upstash database in US West (or update if exists)
- [ ] Update environment variables
- [ ] Test cache operations
- [ ] Delete old database (optional)

---

## Quick Commands Reference

```bash
# Export Supabase database
pg_dump $OLD_DATABASE_URL > backup.sql

# Import to new Supabase
psql $NEW_DATABASE_URL < backup.sql

# Run Prisma migrations
npx prisma migrate deploy

# Test database connection
npx prisma db pull
```

---

## Estimated Time

- **Vercel region change**: 2 minutes
- **Supabase migration**: 30-60 minutes (depending on data size)
- **Upstash setup**: 5 minutes
- **Total**: ~1 hour

---

## Rollback Plan

If something goes wrong:

1. **Vercel**: Just change `vercel.json` back to `["iad1"]` and redeploy
2. **Supabase**: Keep old project until new one is verified, then switch back if needed
3. **Upstash**: Keep old database until new one is working

---

## Cost Impact

- **Vercel**: No cost change (same pricing)
- **Supabase**: No cost change (still free tier)
- **Upstash**: No cost change (still free tier)

**Total additional cost**: $0 🎉

---

## Need Help?

If you run into issues:
1. Check Supabase migration docs: https://supabase.com/docs/guides/platform/migrating-to-supabase
2. Verify database connections with `npx prisma db pull`
3. Check Vercel deployment logs for errors
