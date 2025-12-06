/**
 * Script to add Notion team member fields to User table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding Notion team member fields to User table...\n');

  try {
    // Add notionTeamMemberId column
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "notionTeamMemberId" TEXT
    `;
    console.log('✅ Added notionTeamMemberId column');

    // Add notionTeamMemberName column
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "notionTeamMemberName" TEXT
    `;
    console.log('✅ Added notionTeamMemberName column');

    console.log('\n✅ User table updated successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());


