/**
 * Restore check items to merged systems
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const checkItemsToRestore = {
  'Azure AD': [
    'Review sign-in logs for risky sign-ins or suspicious activity',
    'Check Conditional Access policies and ensure they are enforced',
    'Review MFA registration and authentication methods',
    'Check for stale or inactive user accounts',
    'Review enterprise application access and permissions',
  ],
  'Jamf': [
    'Review device alerts (ie. SIP disabled, failed application installs)',
    'Review devices that are offline for greater than 2 weeks (export and hand to consultant)',
    'Review OS patching and adjust enforcement as needed',
    'Review Apple certificate renewals (APNs, VPP tokens) and update 🔄 Renewal Database',
    'Check Smart Groups for devices falling out of compliance',
  ],
  'Intune': [
    'Review device compliance status and non-compliant devices',
    'Review devices that have not checked in for extended periods',
    'Check Windows Update rings and deployment status',
    'Review application deployment status and failures',
    'Check Conditional Access device compliance policies',
  ],
};

async function main() {
  console.log('🔧 Restoring check items to merged systems...\n');

  for (const [systemName, checkItems] of Object.entries(checkItemsToRestore)) {
    const system = await prisma.system.findUnique({ 
      where: { name: systemName },
      include: { checkItems: true }
    });
    
    if (!system) {
      console.log(`❌ System "${systemName}" not found`);
      continue;
    }
    
    // Check if already has check items
    if (system.checkItems.length > 0) {
      console.log(`⏭️  ${systemName} already has ${system.checkItems.length} check items - skipping`);
      continue;
    }
    
    // Add check items
    let added = 0;
    for (const [index, text] of checkItems.entries()) {
      try {
        await prisma.systemCheckItem.create({
          data: {
            systemId: system.id,
            text: text,
            order: index,
          }
        });
        added++;
      } catch (e) {
        console.log(`   ⚠️ Could not add: ${text.substring(0, 40)}...`);
      }
    }
    
    console.log(`✅ ${systemName}: Added ${added} check items`);
  }

  // Summary
  const total = await prisma.systemCheckItem.count();
  console.log(`\n📊 Total check items in database: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
