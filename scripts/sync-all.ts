/**
 * Sync ALL clients with engineer data from Notion
 * Updated to use shared Notion sync logic (email-first matching, multi-assignment)
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { syncClientsFromNotion } from '../src/lib/notion';
dotenv.config();

const prisma = new PrismaClient();

async function showStats() {
  console.log('\n📋 Database Stats:');
  
  const withSE = await prisma.client.count({ where: { systemEngineerName: { not: null } } });
  const withPrimary = await prisma.client.count({ where: { primaryConsultantName: { not: null } } });
  const withGRCE = await prisma.client.count({ where: { grceEngineerName: { not: null } } });
  const total = await prisma.client.count();
  const assignments = await prisma.clientEngineerAssignment.count();
  
  console.log(`   Total clients: ${total}`);
  console.log(`   With SE assigned: ${withSE}`);
  console.log(`   With Primary Consultant: ${withPrimary}`);
  console.log(`   With GRCE: ${withGRCE}`);
  console.log(`   Assignments rows: ${assignments}`);
  
  // Show sample
  console.log('\n📋 Sample clients:');
  const samples = await prisma.client.findMany({
    where: { systemEngineerName: { not: null } },
    select: { 
      name: true, 
      systemEngineerName: true, 
      primaryConsultantName: true,
      grceEngineerName: true,
    },
    take: 5,
  });
  console.table(samples);
}

async function main() {
  try {
    const res = await syncClientsFromNotion();
    console.log(`\nSync result: synced=${res.synced} created=${res.created} updated=${res.updated} errors=${res.errors.length}`);
    if (res.errors.length) {
      console.log('Errors:');
      res.errors.slice(0, 5).forEach(e => console.log(` - ${e}`));
      if (res.errors.length > 5) console.log(`... ${res.errors.length - 5} more`);
    }
    await showStats();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);






