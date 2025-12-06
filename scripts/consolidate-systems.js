/**
 * Consolidate duplicate systems and add missing ones
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Consolidating systems...\n');

  // 1. Microsoft Entra ID → Azure AD
  // Keep Azure AD, migrate any client links from Microsoft Entra ID
  const entraId = await prisma.system.findUnique({ where: { name: 'Microsoft Entra ID' } });
  const azureAd = await prisma.system.findUnique({ where: { name: 'Azure AD' } });
  
  if (entraId && azureAd) {
    console.log('📦 Merging Microsoft Entra ID → Azure AD');
    // Update client links from Entra ID to Azure AD
    await prisma.clientSystem.updateMany({
      where: { systemId: entraId.id },
      data: { systemId: azureAd.id }
    });
    // Delete Microsoft Entra ID
    await prisma.systemCheckItem.deleteMany({ where: { systemId: entraId.id } });
    await prisma.system.delete({ where: { id: entraId.id } });
    console.log('   ✓ Merged and deleted Microsoft Entra ID');
  } else if (entraId && !azureAd) {
    // Just rename Entra ID to Azure AD
    await prisma.system.update({
      where: { id: entraId.id },
      data: { name: 'Azure AD', description: 'Microsoft Azure Active Directory / Entra ID' }
    });
    console.log('   ✓ Renamed Microsoft Entra ID to Azure AD');
  }

  // 2. Jamf Pro → Jamf
  const jamfPro = await prisma.system.findUnique({ where: { name: 'Jamf Pro' } });
  const jamf = await prisma.system.findUnique({ where: { name: 'Jamf' } });
  
  if (jamfPro && jamf) {
    console.log('📦 Merging Jamf Pro → Jamf');
    await prisma.clientSystem.updateMany({
      where: { systemId: jamfPro.id },
      data: { systemId: jamf.id }
    });
    await prisma.systemCheckItem.deleteMany({ where: { systemId: jamfPro.id } });
    await prisma.system.delete({ where: { id: jamfPro.id } });
    console.log('   ✓ Merged and deleted Jamf Pro');
  } else if (jamfPro && !jamf) {
    await prisma.system.update({
      where: { id: jamfPro.id },
      data: { name: 'Jamf' }
    });
    console.log('   ✓ Renamed Jamf Pro to Jamf');
  }

  // 3. Microsoft Intune → Intune (check if Microsoft Intune exists separately)
  const msIntune = await prisma.system.findUnique({ where: { name: 'Microsoft Intune' } });
  const intune = await prisma.system.findUnique({ where: { name: 'Intune' } });
  
  if (msIntune && intune) {
    console.log('📦 Merging Microsoft Intune → Intune');
    await prisma.clientSystem.updateMany({
      where: { systemId: msIntune.id },
      data: { systemId: intune.id }
    });
    await prisma.systemCheckItem.deleteMany({ where: { systemId: msIntune.id } });
    await prisma.system.delete({ where: { id: msIntune.id } });
    console.log('   ✓ Merged and deleted Microsoft Intune');
  } else if (msIntune && !intune) {
    await prisma.system.update({
      where: { id: msIntune.id },
      data: { name: 'Intune' }
    });
    console.log('   ✓ Renamed Microsoft Intune to Intune');
  }

  // 4. Add Delve to GRC
  console.log('\n➕ Adding Delve to GRC...');
  await prisma.system.upsert({
    where: { name: 'Delve' },
    create: {
      name: 'Delve',
      category: 'GRC',
      description: 'Delve compliance and security platform',
      isActive: true,
    },
    update: {
      category: 'GRC',
      description: 'Delve compliance and security platform',
    }
  });
  console.log('   ✓ Added/Updated Delve');

  // Summary
  const total = await prisma.system.count();
  console.log(`\n📊 Total systems in database: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
