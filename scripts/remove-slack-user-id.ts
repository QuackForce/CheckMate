import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Removing slackUserId column from User table...\n');

  try {
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      DROP COLUMN IF EXISTS "slackUserId"
    `;
    console.log('✅ Removed slackUserId column');

    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


