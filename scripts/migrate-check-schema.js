/**
 * Migrate InfraCheck schema - make some fields optional and add assignedEngineerName
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Migrating InfraCheck schema...\n');

  // Add new columns (if they don't exist)
  try {
    await prisma.$executeRaw`
      ALTER TABLE "InfraCheck" 
      ADD COLUMN IF NOT EXISTS "assignedEngineerName" TEXT;
    `;
    console.log('✅ Added assignedEngineerName column');
  } catch (e) {
    console.log('⏭️  assignedEngineerName column may already exist');
  }

  // Make assignedEngineerId nullable
  try {
    await prisma.$executeRaw`
      ALTER TABLE "InfraCheck" 
      ALTER COLUMN "assignedEngineerId" DROP NOT NULL;
    `;
    console.log('✅ Made assignedEngineerId nullable');
  } catch (e) {
    console.log('⏭️  assignedEngineerId may already be nullable:', e.message);
  }

  // Make templateId nullable
  try {
    await prisma.$executeRaw`
      ALTER TABLE "InfraCheck" 
      ALTER COLUMN "templateId" DROP NOT NULL;
    `;
    console.log('✅ Made templateId nullable');
  } catch (e) {
    console.log('⏭️  templateId may already be nullable:', e.message);
  }

  // Make dueDate nullable
  try {
    await prisma.$executeRaw`
      ALTER TABLE "InfraCheck" 
      ALTER COLUMN "dueDate" DROP NOT NULL;
    `;
    console.log('✅ Made dueDate nullable');
  } catch (e) {
    console.log('⏭️  dueDate may already be nullable:', e.message);
  }

  // Add order column to ItemResult if not exists
  try {
    await prisma.$executeRaw`
      ALTER TABLE "ItemResult" 
      ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;
    `;
    console.log('✅ Added order column to ItemResult');
  } catch (e) {
    console.log('⏭️  order column may already exist in ItemResult');
  }

  console.log('\n✅ Migration complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
