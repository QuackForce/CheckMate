import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding IntegrationSettings table...')
  
  try {
    // Try to add table using raw SQL (run commands separately)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IntegrationSettings" (
        "id" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT false,
        "apiKey" TEXT,
        "apiSecret" TEXT,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "config" TEXT,
        "connectedAt" TIMESTAMP(3),
        "lastTestedAt" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
      )
    `)
    
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationSettings_provider_key" ON "IntegrationSettings"("provider")
    `)
    
    console.log('✅ IntegrationSettings table created!')
    
    // Note: Prisma client needs to be regenerated after schema change
    // Run: npx prisma generate
    // Then you can migrate existing Notion API key from env to database if needed
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Table already exists')
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

