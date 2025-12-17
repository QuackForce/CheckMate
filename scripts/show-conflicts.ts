import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Show detailed information about conflicts between old and new databases
 * 
 * Usage:
 * npx tsx scripts/show-conflicts.ts
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

function getDifferences(oldRecord: any, newRecord: any): string[] {
  const differences: string[] = []
  const allKeys = new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])
  
  for (const key of Array.from(allKeys)) {
    // Skip relation fields and internal Prisma fields
    if (key.startsWith('_') || key === 'accounts' || key === 'sessions' || 
        key === 'ClientSystem' || key === 'ClientTeam' || key === 'ClientEngineerAssignment' ||
        key === 'InfraCheck' || key === 'UserTeam' || key === 'Team' || key === 'User') {
      continue
    }
    
    const oldValue = oldRecord[key]
    const newValue = newRecord[key]
    
    // Handle dates
    const oldDate = oldValue instanceof Date ? oldValue.toISOString() : oldValue
    const newDate = newValue instanceof Date ? newValue.toISOString() : newValue
    
    if (JSON.stringify(oldDate) !== JSON.stringify(newDate)) {
      differences.push(`${key}: "${oldValue}" → "${newValue}"`)
    }
  }
  
  return differences
}

async function showConflicts() {
  console.log('🔍 Finding conflicts...\n')
  console.log(`Old DB (Supabase): ${process.env.OLD_DATABASE_URL?.substring(0, 30)}...`)
  console.log(`New DB (Railway): ${process.env.DATABASE_URL?.substring(0, 30)}...\n`)

  if (!process.env.OLD_DATABASE_URL) {
    console.error('❌ OLD_DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  // Check User conflicts
  console.log('👤 USER CONFLICTS:\n')
  try {
    const oldUsers = await oldDb.user.findMany({ orderBy: { createdAt: 'asc' } })
    const newUsers = await newDb.user.findMany({ orderBy: { createdAt: 'asc' } })
    
    const oldUserMap = new Map(oldUsers.map(u => [u.id, u]))
    const newUserMap = new Map(newUsers.map(u => [u.id, u]))
    
    let userConflictCount = 0
    for (const [id, oldUser] of Array.from(oldUserMap)) {
      const newUser = newUserMap.get(id)
      if (newUser) {
        const differences = getDifferences(oldUser, newUser)
        if (differences.length > 0) {
          userConflictCount++
          console.log(`  Conflict #${userConflictCount}: User ID ${id}`)
          console.log(`    Name: "${oldUser.name || 'null'}" (old) vs "${newUser.name || 'null'}" (new)`)
          console.log(`    Email: "${oldUser.email || 'null'}" (old) vs "${newUser.email || 'null'}" (new)`)
          console.log(`    Role: "${oldUser.role}" (old) vs "${newUser.role}" (new)`)
          console.log(`    Updated: ${oldUser.updatedAt.toISOString()} (old) vs ${newUser.updatedAt.toISOString()} (new)`)
          console.log(`    All differences:`)
          differences.forEach(diff => console.log(`      - ${diff}`))
          console.log()
        }
      }
    }
    
    if (userConflictCount === 0) {
      console.log('  ✅ No conflicts found\n')
    }
  } catch (error: any) {
    console.error('  ❌ Error checking users:', error.message)
  }

  // Check Client conflicts
  console.log('🏢 CLIENT CONFLICTS:\n')
  try {
    const oldClients = await oldDb.client.findMany({ orderBy: { createdAt: 'asc' } })
    const newClients = await newDb.client.findMany({ orderBy: { createdAt: 'asc' } })
    
    const oldClientMap = new Map(oldClients.map(c => [c.id, c]))
    const newClientMap = new Map(newClients.map(c => [c.id, c]))
    
    let clientConflictCount = 0
    for (const [id, oldClient] of Array.from(oldClientMap)) {
      const newClient = newClientMap.get(id)
      if (newClient) {
        const differences = getDifferences(oldClient, newClient)
        if (differences.length > 0) {
          clientConflictCount++
          console.log(`  Conflict #${clientConflictCount}: Client ID ${id}`)
          console.log(`    Name: "${oldClient.name}" (old) vs "${newClient.name}" (new)`)
          console.log(`    Status: "${oldClient.status}" (old) vs "${newClient.status}" (new)`)
          console.log(`    Updated: ${oldClient.updatedAt.toISOString()} (old) vs ${newClient.updatedAt.toISOString()} (new)`)
          
          // Show key differences
          const keyFields = ['notes', 'websiteUrl', 'pocEmail', 'defaultCadence', 'priority']
          const hasKeyDifferences = keyFields.some(field => {
            const oldVal = (oldClient as any)[field]
            const newVal = (newClient as any)[field]
            return JSON.stringify(oldVal) !== JSON.stringify(newVal)
          })
          
          if (hasKeyDifferences) {
            console.log(`    Key field differences:`)
            keyFields.forEach(field => {
              const oldVal = (oldClient as any)[field]
              const newVal = (newClient as any)[field]
              if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                console.log(`      ${field}: "${oldVal || 'null'}" (old) vs "${newVal || 'null'}" (new)`)
              }
            })
          }
          
          console.log(`    All differences (${differences.length}):`)
          differences.slice(0, 10).forEach(diff => console.log(`      - ${diff}`))
          if (differences.length > 10) {
            console.log(`      ... and ${differences.length - 10} more`)
          }
          console.log()
        }
      }
    }
    
    if (clientConflictCount === 0) {
      console.log('  ✅ No conflicts found\n')
    }
  } catch (error: any) {
    console.error('  ❌ Error checking clients:', error.message)
  }

  console.log('\n📝 Summary:')
  console.log('   Conflicts occur when the same record (same ID) has different data in both databases.')
  console.log('   This usually means the record was updated in both databases after migration.')
  console.log('   Recommendation: Keep Railway data (newer) unless Supabase has critical information.\n')

  await oldDb.$disconnect()
  await newDb.$disconnect()
}

showConflicts().catch(console.error)

