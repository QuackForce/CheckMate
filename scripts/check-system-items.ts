import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

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

async function checkSystemItems() {
  console.log('🔍 Checking SystemCheckItem records...\n')

  if (!process.env.OLD_DATABASE_URL) {
    console.error('❌ OLD_DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  // Get all SystemCheckItems from both databases
  const oldItems = await (oldDb as any).systemCheckItem.findMany({
    include: { System: { select: { id: true, name: true } } },
    orderBy: { order: 'asc' },
  })

  const newItems = await (newDb as any).systemCheckItem.findMany({
    include: { System: { select: { id: true, name: true } } },
    orderBy: { order: 'asc' },
  })

  const newItemIds = new Set(newItems.map((item: any) => item.id))
  const missingItems = oldItems.filter((item: any) => !newItemIds.has(item.id))

  console.log(`📊 Summary:`)
  console.log(`   Supabase: ${oldItems.length} SystemCheckItems`)
  console.log(`   Railway: ${newItems.length} SystemCheckItems`)
  console.log(`   Missing: ${missingItems.length} SystemCheckItems\n`)

  if (missingItems.length > 0) {
    console.log('📋 Missing SystemCheckItems:\n')
    
    // Group by system
    const bySystem = new Map<string, any[]>()
    for (const item of missingItems) {
      const systemName = item.System?.name || 'Unknown'
      if (!bySystem.has(systemName)) {
        bySystem.set(systemName, [])
      }
      bySystem.get(systemName)!.push(item)
    }

    for (const [systemName, items] of Array.from(bySystem.entries())) {
      console.log(`  System: ${systemName}`)
      for (const item of items) {
        console.log(`    - ${item.text}`)
        console.log(`      ID: ${item.id}, Order: ${item.order}, Optional: ${item.isOptional}`)
        if (item.description) {
          console.log(`      Description: ${item.description}`)
        }
      }
      console.log()
    }

    // Check specifically for JumpCloud
    const jumpcloudItems = missingItems.filter((item: any) => item.System?.name === 'JumpCloud')
    if (jumpcloudItems.length > 0) {
      console.log(`\n⚠️  Found ${jumpcloudItems.length} missing JumpCloud check items!`)
    }
  } else {
    console.log('✅ All SystemCheckItems are present in Railway\n')
  }

  await oldDb.$disconnect()
  await newDb.$disconnect()
}

checkSystemItems().catch(console.error)

