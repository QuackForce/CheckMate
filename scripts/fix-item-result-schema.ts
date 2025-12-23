import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSchema() {
  try {
    console.log('Adding source and clientSystemCheckItemId columns to ItemResult table...')
    
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
    
    // Add foreign key if ClientSystemCheckItem table exists
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ClientSystemCheckItem') THEN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.table_constraints 
              WHERE constraint_name = 'ItemResult_clientSystemCheckItemId_fkey'
            ) THEN
              ALTER TABLE "ItemResult" 
              ADD CONSTRAINT "ItemResult_clientSystemCheckItemId_fkey" 
              FOREIGN KEY ("clientSystemCheckItemId") 
              REFERENCES "ClientSystemCheckItem"("id") 
              ON DELETE SET NULL ON UPDATE CASCADE;
            END IF;
          END IF;
        END $$;
      `)
      console.log('✓ Added foreign key constraint (if applicable)')
    } catch (e: any) {
      console.log('Note: Could not add foreign key (may already exist or table missing):', e.message)
    }
    
    console.log('\n✅ Database schema updated successfully!')
    console.log('⚠️  IMPORTANT: You must now:')
    console.log('   1. Stop your dev server (Ctrl+C)')
    console.log('   2. Run: npx prisma generate')
    console.log('   3. Restart your dev server')
    
  } catch (error: any) {
    console.error('Error updating schema:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixSchema()

