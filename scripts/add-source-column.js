require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Adding source column to System table...');
  
  try {
    // Add enum type
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "SystemSource" AS ENUM ('APP', 'NOTION', 'SEEDED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Created SystemSource enum');
  } catch (e) {
    console.log('SystemSource enum already exists');
  }
  
  try {
    // Add column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "System" ADD COLUMN IF NOT EXISTS "source" "SystemSource" DEFAULT 'APP';
    `);
    console.log('✓ Added source column');
  } catch (e) {
    console.log('Error adding column:', e.message);
  }
  
  // Update existing seeded systems
  const seededCount = await prisma.$executeRawUnsafe(`
    UPDATE "System" SET "source" = 'SEEDED' WHERE "source" = 'APP';
  `);
  console.log('✓ Marked existing systems as SEEDED');
}

main().catch(console.error).finally(() => prisma.$disconnect());
