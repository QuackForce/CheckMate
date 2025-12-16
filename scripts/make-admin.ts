/**
 * Script to make a user an admin
 * Usage: npx ts-node scripts/make-admin.ts <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('Usage: npx ts-node scripts/make-admin.ts <email>');
    console.log('\nCurrent users:');
    const users = await prisma.user.findMany({
      select: { email: true, name: true, role: true }
    });
    if (users.length === 0) {
      console.log('  No users yet. Sign in with Google first.');
    } else {
      users.forEach(u => {
        console.log(`  ${u.email} - ${u.name || 'No name'} (${u.role})`);
      });
    }
    return;
  }

  console.log(`🔧 Setting ${email} as admin...\n`);

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`❌ User with email "${email}" not found.`);
    console.log('   Make sure they have signed in at least once.');
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' }
  });

  console.log(`✅ ${user.name || email} is now an ADMIN!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());









