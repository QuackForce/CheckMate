# Data Migration Guide - Recovering Missing Data

> **When to use this:** If you migrated from Supabase to Railway and people were still using the app on Supabase during the migration window, you may have missing data.

---

## Overview

During the migration from Supabase to Railway, if users were still active on the old database, some data may have been created/updated after the migration snapshot was taken. This guide helps you:

1. **Identify** what data is missing
2. **Safely migrate** the missing data
3. **Handle conflicts** (same ID, different data)

---

## Step 1: Set Up Environment Variables

Add your old Supabase database URL to `.env.local`:

```bash
# Your current Railway database (already set)
DATABASE_URL="postgresql://postgres:password@railway-host:5432/railway"

# Your old Supabase database (add this)
OLD_DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
```

**⚠️ Important:** Make sure you still have access to your Supabase database. If you've already deleted it, you cannot recover the missing data.

---

## Step 2: Compare Databases

Run the comparison script to see what's missing:

```bash
npx tsx scripts/compare-databases.ts
```

This will show you:
- **Missing records**: Records in Supabase that don't exist in Railway
- **New records**: Records created in Railway after migration (safe to keep)
- **Conflicts**: Records with same ID but different data (need manual review)

**Example output:**
```
📊 Comparison Results:

Table                          Old Count    New Count    Missing      New After Mig   Conflicts
----------------------------------------------------------------------------------------------------
User                           45           42          3            0               0
Client                         120          118         2            0               0
InfraCheck                     350          345         5            0               0
ClientEngineerAssignment       280          275         5            0               0
Team                           9            9           0            0               0
UserTeam                       25           25          0            0               0
ClientTeam                     45           45          0            0               0
```

---

## Step 3: Review Missing Data

Before migrating, review what's missing:

1. **Check the comparison results** - Are the missing records important?
2. **Verify Supabase is still accessible** - Can you still connect?
3. **Check for conflicts** - If conflicts exist, you'll need to manually review them

---

## Step 4: Dry Run Migration

Test the migration without making changes:

```bash
npx tsx scripts/migrate-missing-data.ts
```

This will:
- Show you what would be migrated
- Identify any potential issues
- **Not modify any data** (safe to run)

**Example output:**
```
🔍 DRY RUN MODE - No data will be modified

📋 User: Found 3 missing records
  [DRY RUN] Would migrate: cmir123...
  [DRY RUN] Would migrate: cmir456...
  [DRY RUN] Would migrate: cmir789...

📋 Client: Found 2 missing records
  [DRY RUN] Would migrate: cmirabc...
  [DRY RUN] Would migrate: cmirdef...
```

---

## Step 5: Live Migration

If the dry run looks good, run the actual migration:

```bash
npx tsx scripts/migrate-missing-data.ts --live
```

**⚠️ This will modify your Railway database!**

The script will:
1. Ask for confirmation
2. Migrate missing records from Supabase to Railway
3. Skip records that would cause conflicts
4. Report any errors

---

## Step 6: Verify Migration

After migration, run the comparison again:

```bash
npx tsx scripts/compare-databases.ts
```

You should see:
- ✅ **0 missing records** (all data migrated)
- ✅ **0 conflicts** (or conflicts resolved)
- ℹ️ **New records** in Railway are fine (they represent new activity)

---

## Handling Conflicts

If you see conflicts (same ID, different data), you have two options:

### Option 1: Keep Railway Data (Recommended)
- Railway data is newer (created after migration)
- Users have been using Railway, so Railway data is more current
- **Action:** Do nothing - Railway data is correct

### Option 2: Keep Supabase Data
- If Supabase data is more important
- **Action:** Manually update Railway records with Supabase data
- **Warning:** This will overwrite newer Railway data

### Option 3: Merge Data
- If both have important information
- **Action:** Manually review and merge the data
- **Example:** Keep Railway's `updatedAt` but use Supabase's `notes` field

---

## Will This Break Anything?

**Short answer: No, if done correctly.**

The migration script:
- ✅ Only inserts **missing** records (doesn't overwrite existing ones)
- ✅ Skips records that would cause conflicts
- ✅ Preserves all existing Railway data
- ✅ Handles foreign key relationships safely

**Potential issues:**
- ⚠️ **Duplicate IDs**: Script skips these automatically
- ⚠️ **Foreign key violations**: Script handles these gracefully
- ⚠️ **Data inconsistencies**: Review conflicts manually

---

## What Gets Migrated?

The script migrates these tables:
- ✅ `User` - New users created after migration
- ✅ `Client` - New clients created after migration
- ✅ `InfraCheck` - New checks created after migration
- ✅ `ClientEngineerAssignment` - New assignments created after migration
- ✅ `Team` - New teams created after migration
- ✅ `UserTeam` - New user-team associations
- ✅ `ClientTeam` - New client-team associations

**What's NOT migrated:**
- ❌ Relations (handled automatically by Prisma)
- ❌ Records that already exist (prevents duplicates)
- ❌ Records with conflicts (requires manual review)

---

## Troubleshooting

### Error: "OLD_DATABASE_URL not set"
**Solution:** Add `OLD_DATABASE_URL` to your `.env.local` file

### Error: "Connection refused"
**Solution:** 
- Check if Supabase database is still accessible
- Verify the connection string is correct
- Check if Supabase project was deleted

### Error: "Unique constraint violation"
**Solution:** 
- This is expected for conflicts
- Script automatically skips these
- Review conflicts manually if needed

### Error: "Foreign key constraint violation"
**Solution:**
- Make sure parent records exist first
- Run migration in order: Users → Clients → Assignments
- Script handles this automatically

---

## Best Practices

1. **Always run dry run first** - Never migrate without testing
2. **Backup Railway database** - Before live migration, create a backup
3. **Review conflicts manually** - Don't auto-merge conflicting data
4. **Test after migration** - Verify everything works correctly
5. **Keep Supabase for 1 week** - As a backup after migration

---

## Quick Reference

```bash
# 1. Compare databases
npx tsx scripts/compare-databases.ts

# 2. Dry run migration
npx tsx scripts/migrate-missing-data.ts

# 3. Live migration (after review)
npx tsx scripts/migrate-missing-data.ts --live

# 4. Verify migration
npx tsx scripts/compare-databases.ts
```

---

## Need Help?

If you encounter issues:
1. Check the error message
2. Review the troubleshooting section
3. Verify both databases are accessible
4. Make sure environment variables are set correctly

---

## Safety Checklist

Before running live migration:
- [ ] Ran comparison script
- [ ] Reviewed missing records
- [ ] Ran dry run migration
- [ ] Verified dry run results
- [ ] Backed up Railway database
- [ ] Confirmed Supabase is accessible
- [ ] Ready to proceed with live migration

