import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding Harvest columns to User table...')
  
  try {
    // Try to add columns using raw SQL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "harvestAccessToken" TEXT,
      ADD COLUMN IF NOT EXISTS "harvestAccountId" TEXT,
      ADD COLUMN IF NOT EXISTS "harvestUserId" TEXT;
    `)
    
    console.log('✅ Harvest columns added successfully!')
  } catch (error: any) {
    // If columns already exist, that's fine
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Columns already exist')
    } else {
      console.error('Error:', error.message)
      throw error
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


