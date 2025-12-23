const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function addColumns() {
  try {
    console.log('Adding columns to ItemResult table...')
    
    // Add source column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ItemResult" 
      ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'SYSTEM';
    `)
    console.log('✓ Added source column')
    
    // Add clientSystemCheckItemId column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "ItemResult" 
      ADD COLUMN IF NOT EXISTS "clientSystemCheckItemId" TEXT;
    `)
    console.log('✓ Added clientSystemCheckItemId column')
    
    console.log('\n✅ Columns added successfully!')
    console.log('Now run: npx prisma generate')
    
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addColumns()

