# Railway Migration Guide - Step by Step

> **Status:** Ready to execute  
> **Estimated Time:** 30-45 minutes  
> **Data Loss Risk:** ✅ **ZERO** - We'll backup everything first

---

## ✅ Pre-Migration Checklist

- [x] Railway Hobby account created and paid
- [ ] Current Supabase database URL saved
- [ ] Backup created (we'll do this)
- [ ] Railway PostgreSQL database created
- [ ] Migration tested locally first

---

## Step 1: Create PostgreSQL Database on Railway

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - You should see your project (or create a new one)

2. **Provision PostgreSQL**
   - Click **"New"** → **"Database"** → **"Add PostgreSQL"**
   - Railway will automatically provision a PostgreSQL database
   - Wait ~30 seconds for it to be ready

3. **Get Database Connection String**
   - Click on the PostgreSQL service
   - Go to the **"Variables"** tab
   - Find `DATABASE_URL` and copy it
   - **IMPORTANT:** Also check if there's a `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER` - Railway might provide these separately
   - The URL format should be: `postgresql://postgres:password@hostname:5432/railway`

4. **Save Railway Credentials**
   - Save the `DATABASE_URL` somewhere safe (we'll use it later)
   - Don't update your Vercel environment yet!

---

## Step 2: Backup Current Supabase Database

**⚠️ CRITICAL: Do this FIRST before any changes!**

1. **Get Your Current Database URL**
   ```bash
   # Check your .env.local file or Vercel environment variables
   # It should look like: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
   ```

2. **Create Backup**
   ```bash
   # Install pg_dump if you don't have it (macOS)
   # brew install postgresql
   
   # Export entire database to SQL file
   pg_dump "YOUR_SUPABASE_DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Example:
   # pg_dump "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" > backup_20250115_143000.sql
   ```

3. **Verify Backup File**
   ```bash
   # Check the file was created and has content
   ls -lh backup_*.sql
   head -20 backup_*.sql  # Should see SQL statements
   ```

4. **Store Backup Safely**
   - Keep this file! It's your rollback plan
   - Consider uploading to cloud storage (Google Drive, Dropbox, etc.)

---

## Step 3: Test Railway Connection Locally

1. **Update Local .env.local (Temporarily)**
   ```bash
   # Add Railway URL to your .env.local (keep Supabase URL commented)
   # DATABASE_URL="your-supabase-url"  # OLD - keep for reference
   DATABASE_URL="your-railway-url"     # NEW
   DIRECT_URL="your-railway-url"       # Same as DATABASE_URL for Railway
   ```

2. **Test Connection**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Test connection
   npx prisma db pull
   ```

3. **If connection works, proceed. If not, check Railway dashboard.**

---

## Step 4: Migrate Schema to Railway

1. **Push Schema (Creates Tables)**
   ```bash
   # This creates all tables in Railway database
   npx prisma db push
   ```

2. **Verify Tables Created**
   - Go to Railway dashboard → PostgreSQL → **"Data"** tab
   - You should see all your Prisma tables (User, Client, InfraCheck, etc.)
   - Tables will be empty (that's expected - we'll import data next)

---

## Step 5: Import Data from Backup

1. **Import Data to Railway**
   ```bash
   # Import your backup into Railway
   psql "YOUR_RAILWAY_DATABASE_URL" < backup_YYYYMMDD_HHMMSS.sql
   
   # Example:
   # psql "postgresql://postgres:password@hostname:5432/railway" < backup_20250115_143000.sql
   ```

2. **Verify Data Imported**
   - Check Railway dashboard → PostgreSQL → **"Data"** tab
   - Click on a table (e.g., `User`) - you should see your data
   - Count records to verify

3. **Test Locally**
   ```bash
   # Start dev server
   npm run dev
   
   # Test that you can:
   # - Log in
   # - See clients
   # - See team members
   # - Everything works!
   ```

---

## Step 6: Update Vercel Environment Variables

**⚠️ Only do this after local testing is successful!**

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Select your project
   - Go to **Settings** → **Environment Variables**

2. **Update DATABASE_URL**
   - Find `DATABASE_URL`
   - Click **Edit**
   - Replace Supabase URL with Railway URL
   - Save

3. **Update DIRECT_URL** (if it exists)
   - Find `DIRECT_URL`
   - Update to Railway URL (same as DATABASE_URL)
   - Save

4. **Redeploy Application**
   - Go to **Deployments** tab
   - Click **"..."** on latest deployment → **"Redeploy"**
   - Or push a commit to trigger new deployment

---

## Step 7: Verify Production

1. **Test Production Site**
   - Visit your production URL
   - Log in
   - Test key features:
     - [ ] Dashboard loads
     - [ ] Clients page works
     - [ ] Team page works
     - [ ] Can create/edit clients
     - [ ] Can create checks
     - [ ] Everything functions normally

2. **Monitor Railway Dashboard**
   - Check Railway → PostgreSQL → **"Metrics"**
   - Verify connections are active
   - Check no errors

3. **Monitor Vercel Logs**
   - Check Vercel → Deployments → Latest → **"Functions"** tab
   - Look for any database connection errors

---

## Step 8: Cleanup (Optional)

Once everything is working for 24-48 hours:

1. **Keep Supabase for 1 week** (as backup)
2. **After confirming everything works**, you can:
   - Delete Supabase project (optional)
   - Remove old DATABASE_URL from local .env.local

---

## 🚨 Rollback Plan (If Something Goes Wrong)

If you need to rollback:

1. **Revert Vercel Environment**
   - Go to Vercel → Settings → Environment Variables
   - Change `DATABASE_URL` back to Supabase URL
   - Redeploy

2. **Your Supabase database is untouched** - it's still running with all your data

3. **No data loss** - everything is still in Supabase

---

## Common Issues & Solutions

### Issue: `pg_dump: command not found`
**Solution:**
```bash
# macOS
brew install postgresql

# Or use Docker
docker run --rm -e PGPASSWORD=password postgres:15 pg_dump -h hostname -U postgres -d database > backup.sql
```

### Issue: Connection timeout during import
**Solution:**
- Railway might have connection limits
- Try importing during off-peak hours
- Or use Railway's built-in import feature (if available)

### Issue: Prisma schema out of sync
**Solution:**
```bash
# Pull current schema from Railway
npx prisma db pull

# Compare with your schema.prisma
# Fix any differences, then:
npx prisma db push
```

### Issue: Missing DIRECT_URL
**Solution:**
- Railway doesn't need DIRECT_URL (it's for connection pooling)
- Set `DIRECT_URL` to same as `DATABASE_URL` in Vercel

---

## Expected Results

After migration:
- ✅ **No data loss** - All data migrated
- ✅ **Faster page loads** - No cold starts
- ✅ **100 GB egress** - Plenty of headroom
- ✅ **Always-on database** - No pausing
- ✅ **Better performance** - Dedicated resources

---

## Need Help?

If you run into issues:
1. Check Railway dashboard for database status
2. Check Vercel logs for errors
3. Verify environment variables are set correctly
4. Test connection locally first before updating production

---

## Quick Reference Commands

```bash
# Backup current database
pg_dump "OLD_URL" > backup.sql

# Test Railway connection
DATABASE_URL="NEW_URL" npx prisma db pull

# Push schema to Railway
DATABASE_URL="NEW_URL" npx prisma db push

# Import data to Railway
psql "NEW_URL" < backup.sql

# Verify data
DATABASE_URL="NEW_URL" npx prisma studio
```

