import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Compare two databases to find missing records
 * 
 * Usage:
 * 1. Set OLD_DATABASE_URL in .env.local (your Supabase URL)
 * 2. Set DATABASE_URL in .env.local (your Railway URL - current)
 * 3. Run: npx tsx scripts/compare-databases.ts
 */

const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL,
    },
  },
})

const newDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

interface ComparisonResult {
  table: string
  oldCount: number
  newCount: number
  missing: number
  newRecords: number
  conflicts: number
}

async function compareTable(
  tableName: string,
  getOldRecords: () => Promise<any[]>,
  getNewRecords: () => Promise<any[]>,
  getId: (record: any) => string
): Promise<ComparisonResult> {
  try {
    const oldRecords = await getOldRecords()
    const newRecords = await getNewRecords()

    const oldIds = new Set(oldRecords.map(getId))
    const newIds = new Set(newRecords.map(getId))

    // Find records in old DB that aren't in new DB
    const missing = oldRecords.filter(r => !newIds.has(getId(r)))

    // Find records in new DB that aren't in old DB (created after migration)
    const newRecordsAfterMigration = newRecords.filter(r => !oldIds.has(getId(r)))

    // Find conflicts (same ID but different data)
    const conflicts = oldRecords.filter(oldRecord => {
      const newRecord = newRecords.find(r => getId(r) === getId(oldRecord))
      if (!newRecord) return false
      // Simple comparison - you might want to deep compare
      return JSON.stringify(oldRecord) !== JSON.stringify(newRecord)
    })

    return {
      table: tableName,
      oldCount: oldRecords.length,
      newCount: newRecords.length,
      missing: missing.length,
      newRecords: newRecordsAfterMigration.length,
      conflicts: conflicts.length,
    }
  } catch (error: any) {
    console.error(`Error comparing ${tableName}:`, error.message)
    return {
      table: tableName,
      oldCount: 0,
      newCount: 0,
      missing: 0,
      newRecords: 0,
      conflicts: 0,
    }
  }
}

async function compareDatabases() {
  console.log('🔍 Comparing databases...\n')
  console.log(`Old DB (Supabase): ${process.env.OLD_DATABASE_URL?.substring(0, 30)}...`)
  console.log(`New DB (Railway): ${process.env.DATABASE_URL?.substring(0, 30)}...\n`)

  if (!process.env.OLD_DATABASE_URL) {
    console.error('❌ OLD_DATABASE_URL not set in .env.local')
    console.log('Please add: OLD_DATABASE_URL="your-supabase-url"')
    process.exit(1)
  }

  const results: ComparisonResult[] = []

  // Compare Users
  results.push(await compareTable(
    'User',
    () => oldDb.user.findMany({ orderBy: { createdAt: 'asc' } }),
    () => newDb.user.findMany({ orderBy: { createdAt: 'asc' } }),
    (u) => u.id
  ))

  // Compare Clients
  results.push(await compareTable(
    'Client',
    () => oldDb.client.findMany({ orderBy: { createdAt: 'asc' } }),
    () => newDb.client.findMany({ orderBy: { createdAt: 'asc' } }),
    (c) => c.id
  ))

  // Compare InfraChecks
  results.push(await compareTable(
    'InfraCheck',
    () => oldDb.infraCheck.findMany({ orderBy: { createdAt: 'asc' } }),
    () => newDb.infraCheck.findMany({ orderBy: { createdAt: 'asc' } }),
    (c) => c.id
  ))

  // Compare ClientEngineerAssignment
  results.push(await compareTable(
    'ClientEngineerAssignment',
    () => (oldDb as any).clientEngineerAssignment.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).clientEngineerAssignment.findMany({ orderBy: { createdAt: 'asc' } }),
    (a) => a.id
  ))

  // Compare Teams
  results.push(await compareTable(
    'Team',
    () => (oldDb as any).team.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).team.findMany({ orderBy: { createdAt: 'asc' } }),
    (t) => t.id
  ))

  // Compare UserTeam
  results.push(await compareTable(
    'UserTeam',
    () => (oldDb as any).userTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).userTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    (ut) => ut.id
  ))

  // Compare ClientTeam
  results.push(await compareTable(
    'ClientTeam',
    () => (oldDb as any).clientTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).clientTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    (ct) => ct.id
  ))

  // Print results
  console.log('📊 Comparison Results:\n')
  console.log('Table'.padEnd(30), 'Old Count'.padEnd(12), 'New Count'.padEnd(12), 'Missing'.padEnd(12), 'New After Mig'.padEnd(15), 'Conflicts')
  console.log('-'.repeat(100))

  let totalMissing = 0
  let totalNew = 0
  let totalConflicts = 0

  for (const result of results) {
    console.log(
      result.table.padEnd(30),
      result.oldCount.toString().padEnd(12),
      result.newCount.toString().padEnd(12),
      result.missing.toString().padEnd(12),
      result.newRecords.toString().padEnd(15),
      result.conflicts.toString()
    )
    totalMissing += result.missing
    totalNew += result.newRecords
    totalConflicts += result.conflicts
  }

  console.log('-'.repeat(100))
  console.log('TOTALS'.padEnd(30), ''.padEnd(12), ''.padEnd(12), totalMissing.toString().padEnd(12), totalNew.toString().padEnd(15), totalConflicts.toString())
  console.log()

  if (totalMissing > 0) {
    console.log('⚠️  WARNING: Found missing records!')
    console.log(`   ${totalMissing} records exist in old database but not in new database.`)
    console.log('   Run: npx tsx scripts/migrate-missing-data.ts to migrate them.\n')
  }

  if (totalNew > 0) {
    console.log('ℹ️  INFO: Found new records created after migration.')
    console.log(`   ${totalNew} records were created in the new database after migration.`)
    console.log('   These are safe to keep - they represent new activity.\n')
  }

  if (totalConflicts > 0) {
    console.log('⚠️  WARNING: Found conflicts!')
    console.log(`   ${totalConflicts} records have the same ID but different data.`)
    console.log('   Review these manually before merging.\n')
  }

  if (totalMissing === 0 && totalConflicts === 0) {
    console.log('✅ All data is in sync! No missing records or conflicts.\n')
  }

  await oldDb.$disconnect()
  await newDb.$disconnect()
}

compareDatabases().catch(console.error)

