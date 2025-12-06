import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Slack data for all users...\n');

  try {
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        slackUsername: true,
        slackUserId: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No name'} (${user.email})`);
      console.log(`   Slack Username (display name): ${user.slackUsername || '❌ Not set'}`);
      console.log(`   Slack User ID: ${user.slackUserId || '❌ Not set'}`);
      if (user.slackUserId) {
        console.log(`   Mention format: <@${user.slackUserId}>`);
      }
      console.log('');
    });

    const withSlackData = users.filter(u => u.slackUserId && u.slackUsername);
    const missingData = users.filter(u => !u.slackUserId || !u.slackUsername);

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Users with Slack data: ${withSlackData.length}`);
    console.log(`   ❌ Users missing Slack data: ${missingData.length}`);

    if (missingData.length > 0) {
      console.log(`\n⚠️  Users missing Slack data:`);
      missingData.forEach(user => {
        console.log(`   - ${user.name || 'No name'} (${user.email})`);
      });
    }

    console.log('\n✅ Check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

