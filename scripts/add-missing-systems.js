/**
 * Add missing systems from Notion vendors to our database
 * Only adding systems relevant for infra checks (no ISPs, HR tools, etc.)
 */
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const missingSystems = [
  // IDENTITY
  { name: 'JumpCloud', category: 'IDENTITY', description: 'JumpCloud directory and identity management' },
  { name: 'OneLogin', category: 'IDENTITY', description: 'OneLogin identity and access management' },
  { name: 'Azure AD', category: 'IDENTITY', description: 'Microsoft Azure Active Directory' },
  
  // MDM
  { name: 'Jamf', category: 'MDM', description: 'Jamf Apple device management' },
  { name: 'Intune', category: 'MDM', description: 'Microsoft Intune device management' },
  { name: 'Hexnode', category: 'MDM', description: 'Hexnode unified endpoint management' },
  { name: 'Mosyle', category: 'MDM', description: 'Mosyle Apple device management' },
  { name: 'SimpleMDM', category: 'MDM', description: 'SimpleMDM Apple device management' },
  { name: 'MobileIron', category: 'MDM', description: 'MobileIron enterprise mobility management' },
  { name: 'IBM MaaS360', category: 'MDM', description: 'IBM MaaS360 unified endpoint management' },
  { name: 'Scalefusion', category: 'MDM', description: 'Scalefusion device management' },
  { name: 'Miradore', category: 'MDM', description: 'Miradore mobile device management' },
  { name: 'Workspace One', category: 'MDM', description: 'VMware Workspace ONE unified endpoint management' },
  { name: 'Apple Business Essentials', category: 'MDM', description: 'Apple Business Essentials device management' },
  
  // AV/EDR
  { name: 'Huntress', category: 'AV_EDR', description: 'Huntress managed threat detection and response' },
  { name: 'Windows Defender', category: 'AV_EDR', description: 'Microsoft Windows Defender antivirus' },
  { name: 'Microsoft Defender', category: 'AV_EDR', description: 'Microsoft Defender for Endpoint' },
  { name: 'Malwarebytes', category: 'AV_EDR', description: 'Malwarebytes endpoint protection' },
  { name: 'Arctic Wolf', category: 'AV_EDR', description: 'Arctic Wolf managed detection and response' },
  { name: 'Cylance', category: 'AV_EDR', description: 'Cylance AI-powered endpoint security' },
  { name: 'Trend Micro', category: 'AV_EDR', description: 'Trend Micro endpoint security' },
  { name: 'Webroot', category: 'AV_EDR', description: 'Webroot endpoint protection' },
  { name: 'Norton', category: 'AV_EDR', description: 'Norton endpoint protection' },
  { name: 'ESET', category: 'AV_EDR', description: 'ESET endpoint protection' },
  { name: 'Bitdefender', category: 'AV_EDR', description: 'Bitdefender endpoint security' },
  { name: 'Avira', category: 'AV_EDR', description: 'Avira antivirus protection' },
  { name: 'Cortex', category: 'AV_EDR', description: 'Palo Alto Cortex XDR' },
  { name: 'Covalence', category: 'AV_EDR', description: 'Covalence managed endpoint detection' },
  
  // PASSWORD MANAGER
  { name: 'LastPass', category: 'PASSWORD', description: 'LastPass password management' },
  { name: 'Dashlane', category: 'PASSWORD', description: 'Dashlane password manager' },
  { name: 'Keeper', category: 'PASSWORD', description: 'Keeper password management' },
  
  // GRC
  { name: 'Secureframe', category: 'GRC', description: 'Secureframe compliance automation' },
  { name: 'Sprinto', category: 'GRC', description: 'Sprinto compliance automation' },
  { name: 'Thoropass', category: 'GRC', description: 'Thoropass compliance management' },
  { name: 'Hyperproof', category: 'GRC', description: 'Hyperproof compliance operations' },
  { name: 'Apptega', category: 'GRC', description: 'Apptega cybersecurity compliance' },
  { name: 'OneTrust', category: 'GRC', description: 'OneTrust privacy and GRC platform' },
  
  // SECURITY TRAINING
  { name: 'Ninjio', category: 'SECURITY_TRAINING', description: 'Ninjio security awareness training' },
  { name: 'EasyLlama', category: 'SECURITY_TRAINING', description: 'EasyLlama compliance training' },
  { name: 'Bullphish', category: 'SECURITY_TRAINING', description: 'Bullphish phishing simulation' },
  
  // BACKUP
  { name: 'CloudAlly', category: 'BACKUP', description: 'CloudAlly cloud-to-cloud backup' },
  { name: 'Dropsuite', category: 'BACKUP', description: 'Dropsuite cloud backup and archiving' },
  { name: 'SpinOne', category: 'BACKUP', description: 'SpinOne cloud data protection' },
  { name: 'Backblaze', category: 'BACKUP', description: 'Backblaze cloud backup' },
  
  // EMAIL SECURITY
  { name: 'CheckPoint Harmony', category: 'EMAIL_SECURITY', description: 'CheckPoint Harmony email security' },
  { name: 'Valimail', category: 'EMAIL_SECURITY', description: 'Valimail email authentication' },
  { name: 'Cisco Umbrella', category: 'EMAIL_SECURITY', description: 'Cisco Umbrella DNS security' },
  { name: 'DNSFilter', category: 'EMAIL_SECURITY', description: 'DNSFilter DNS threat protection' },
];

async function main() {
  console.log('➕ Adding missing systems to database...\n');
  
  let added = 0;
  let skipped = 0;
  
  for (const system of missingSystems) {
    try {
      await prisma.system.upsert({
        where: { name: system.name },
        create: {
          name: system.name,
          category: system.category,
          description: system.description,
          isActive: true,
        },
        update: {
          category: system.category,
          description: system.description,
        },
      });
      console.log(`  ✓ Added/Updated: ${system.name} (${system.category})`);
      added++;
    } catch (error) {
      console.log(`  ✗ Skipped: ${system.name} - ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`\n📊 Summary: ${added} systems added/updated, ${skipped} skipped`);
  
  const total = await prisma.system.count();
  console.log(`📦 Total systems in database: ${total}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
