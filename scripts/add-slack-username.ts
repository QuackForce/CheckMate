/**
 * Script to add slackUsername column to User table
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Adding slackUsername column to User table...\n')

  try {
    // Add slackUsername column
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "slackUsername" TEXT
    `
    console.log('✅ Added slackUsername column')

    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())


