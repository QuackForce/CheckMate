import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding Google Calendar fields to User table...')
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "googleCalendarAccessToken" TEXT,
      ADD COLUMN IF NOT EXISTS "googleCalendarRefreshToken" TEXT,
      ADD COLUMN IF NOT EXISTS "googleCalendarExpiresAt" TIMESTAMP(3);
    `)
    
    console.log('✅ Google Calendar fields added successfully!')
  } catch (error: any) {
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

