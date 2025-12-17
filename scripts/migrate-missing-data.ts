import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Migrate missing data from old database (Supabase) to new database (Railway)
 * 
 * This script:
 * 1. Finds records in old DB that don't exist in new DB
 * 2. Safely inserts them into new DB
 * 3. Handles conflicts (same ID, different data)
 * 
 * Usage:
 * 1. Set OLD_DATABASE_URL in .env.local (your Supabase URL)
 * 2. Set DATABASE_URL in .env.local (your Railway URL - current)
 * 3. Run: npx tsx scripts/migrate-missing-data.ts
 * 
 * ⚠️  IMPORTANT: Review the comparison results first with compare-databases.ts
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

interface MigrationStats {
  table: string
  migrated: number
  skipped: number
  errors: number
}

async function migrateTable(
  tableName: string,
  getOldRecords: () => Promise<any[]>,
  getNewRecords: () => Promise<any[]>,
  getId: (record: any) => string,
  insertRecord: (record: any) => Promise<any>,
  dryRun: boolean = false
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    table: tableName,
    migrated: 0,
    skipped: 0,
    errors: 0,
  }

  try {
    const oldRecords = await getOldRecords()
    const newRecords = await getNewRecords()

    const newIds = new Set(newRecords.map(getId))

    // Find records in old DB that aren't in new DB
    const missing = oldRecords.filter(r => !newIds.has(getId(r)))

    console.log(`\n📋 ${tableName}: Found ${missing.length} missing records`)

    for (const record of missing) {
      try {
        if (dryRun) {
          console.log(`  [DRY RUN] Would migrate: ${getId(record)}`)
          stats.migrated++
        } else {
          await insertRecord(record)
          stats.migrated++
          console.log(`  ✅ Migrated: ${getId(record)}`)
        }
      } catch (error: any) {
        stats.errors++
        console.error(`  ❌ Error migrating ${getId(record)}:`, error.message)
        
        // If it's a unique constraint error, the record might exist with different data
        if (error.code === 'P2002') {
          console.log(`     ⚠️  Record exists but with different data (conflict) - skipping`)
          stats.skipped++
        }
      }
    }
  } catch (error: any) {
    console.error(`Error migrating ${tableName}:`, error.message)
    stats.errors++
  }

  return stats
}

async function migrateMissingData(dryRun: boolean = true) {
  console.log('🚀 Migrating missing data...\n')
  console.log(`Old DB (Supabase): ${process.env.OLD_DATABASE_URL?.substring(0, 30)}...`)
  console.log(`New DB (Railway): ${process.env.DATABASE_URL?.substring(0, 30)}...\n`)

  if (!process.env.OLD_DATABASE_URL) {
    console.error('❌ OLD_DATABASE_URL not set in .env.local')
    console.log('Please add: OLD_DATABASE_URL="your-supabase-url"')
    process.exit(1)
  }

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be modified\n')
  } else {
    console.log('⚠️  LIVE MODE - Data will be migrated\n')
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer: string = await new Promise((resolve) => {
      readline.question('Are you sure you want to proceed? (yes/no): ', resolve)
    })

    readline.close()

    if (answer.toLowerCase() !== 'yes') {
      console.log('Migration cancelled.')
      process.exit(0)
    }
  }

  const stats: MigrationStats[] = []

  // Migrate Users (be careful - check for conflicts)
  stats.push(await migrateTable(
    'User',
    () => oldDb.user.findMany({ orderBy: { createdAt: 'asc' } }),
    () => newDb.user.findMany({ orderBy: { createdAt: 'asc' } }),
    (u) => u.id,
    async (user) => {
      // Remove relations that will be created separately
      const { accounts, sessions, ...userData } = user as any
      return newDb.user.create({ data: userData })
    },
    dryRun
  ))

  // Migrate Clients
  stats.push(await migrateTable(
    'Client',
    () => oldDb.client.findMany({ orderBy: { createdAt: 'asc' } }),
    () => newDb.client.findMany({ orderBy: { createdAt: 'asc' } }),
    (c) => c.id,
    async (client) => {
      // Remove relations
      const { ClientSystem, ClientTeam, ClientEngineerAssignment, InfraCheck, ...clientData } = client as any
      return newDb.client.create({ data: clientData })
    },
    dryRun
  ))

  // Migrate InfraChecks
  stats.push(await migrateTable(
    'InfraCheck',
    () => oldDb.infraCheck.findMany({ orderBy: { createdAt: 'asc' } }),
    () => newDb.infraCheck.findMany({ orderBy: { createdAt: 'asc' } }),
    (c) => c.id,
    async (check) => {
      // Remove relations
      const { CategoryResult, ItemResult, ...checkData } = check as any
      return newDb.infraCheck.create({ data: checkData })
    },
    dryRun
  ))

  // Migrate ClientEngineerAssignment
  stats.push(await migrateTable(
    'ClientEngineerAssignment',
    () => (oldDb as any).clientEngineerAssignment.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).clientEngineerAssignment.findMany({ orderBy: { createdAt: 'asc' } }),
    (a) => a.id,
    async (assignment) => {
      // Remove relations
      const { Client, User, ...assignmentData } = assignment as any
      return (newDb as any).clientEngineerAssignment.create({ data: assignmentData })
    },
    dryRun
  ))

  // Migrate Teams
  stats.push(await migrateTable(
    'Team',
    () => (oldDb as any).team.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).team.findMany({ orderBy: { createdAt: 'asc' } }),
    (t) => t.id,
    async (team) => {
      // Remove relations
      const { ClientTeam, UserTeam, User, ...teamData } = team as any
      return (newDb as any).team.create({ data: teamData })
    },
    dryRun
  ))

  // Migrate UserTeam
  stats.push(await migrateTable(
    'UserTeam',
    () => (oldDb as any).userTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).userTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    (ut) => ut.id,
    async (userTeam) => {
      // Remove relations
      const { User, Team, ...userTeamData } = userTeam as any
      return (newDb as any).userTeam.create({ data: userTeamData })
    },
    dryRun
  ))

  // Migrate ClientTeam
  stats.push(await migrateTable(
    'ClientTeam',
    () => (oldDb as any).clientTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    () => (newDb as any).clientTeam.findMany({ orderBy: { createdAt: 'asc' } }),
    (ct) => ct.id,
    async (clientTeam) => {
      // Remove relations
      const { Client, Team, ...clientTeamData } = clientTeam as any
      return (newDb as any).clientTeam.create({ data: clientTeamData })
    },
    dryRun
  ))

  // Print summary
  console.log('\n📊 Migration Summary:\n')
  console.log('Table'.padEnd(30), 'Migrated'.padEnd(12), 'Skipped'.padEnd(12), 'Errors')
  console.log('-'.repeat(70))

  let totalMigrated = 0
  let totalSkipped = 0
  let totalErrors = 0

  for (const stat of stats) {
    console.log(
      stat.table.padEnd(30),
      stat.migrated.toString().padEnd(12),
      stat.skipped.toString().padEnd(12),
      stat.errors.toString()
    )
    totalMigrated += stat.migrated
    totalSkipped += stat.skipped
    totalErrors += stat.errors
  }

  console.log('-'.repeat(70))
  console.log('TOTALS'.padEnd(30), totalMigrated.toString().padEnd(12), totalSkipped.toString().padEnd(12), totalErrors.toString())
  console.log()

  if (dryRun) {
    console.log('🔍 This was a DRY RUN. No data was modified.')
    console.log('   To actually migrate, run: npx tsx scripts/migrate-missing-data.ts --live\n')
  } else {
    console.log('✅ Migration complete!\n')
  }

  await oldDb.$disconnect()
  await newDb.$disconnect()
}

// Check for --live flag
const dryRun = !process.argv.includes('--live')

migrateMissingData(dryRun).catch(console.error)

