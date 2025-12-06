import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding infraCheckAssigneeName column to Client table...')
  
  try {
    // Add the new column
    await prisma.$executeRaw`
      ALTER TABLE "Client" 
      ADD COLUMN IF NOT EXISTS "infraCheckAssigneeName" TEXT
    `
    console.log('✅ Column added successfully!')
  } catch (error) {
    console.error('Error:', error)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())


