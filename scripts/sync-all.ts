/**
 * Sync ALL clients with engineer data from Notion
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const NOTION_API_KEY = process.env.NOTION_API_KEY || '';
const CLIENTS_DB = process.env.NOTION_CLIENT_DATABASE_ID || '';
const TEAM_MEMBERS_DB = process.env.NOTION_TEAM_MEMBERS_DATABASE_ID || '';

// Team member cache
const teamMemberCache = new Map<string, string>();

async function loadTeamMembers() {
  console.log('📥 Loading team members...');
  
  let hasMore = true;
  let cursor: string | null = null;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const response = await fetch(`https://api.notion.com/v1/databases/${TEAM_MEMBERS_DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    for (const page of data.results) {
      for (const [, prop] of Object.entries(page.properties)) {
        const p = prop as any;
        if (p.type === 'title' && p.title?.[0]?.plain_text) {
          teamMemberCache.set(page.id, p.title[0].plain_text);
          break;
        }
      }
    }

    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  console.log(`✅ Loaded ${teamMemberCache.size} team members\n`);
}

function getTeamMemberNames(relationIds: string[]): string[] {
  return relationIds
    .map(id => teamMemberCache.get(id))
    .filter((name): name is string => !!name);
}

function getPropertyValue(property: any): any {
  if (!property) return null;
  switch (property.type) {
    case 'title': return property.title?.[0]?.plain_text || null;
    case 'rich_text': return property.rich_text?.[0]?.plain_text || null;
    case 'select': return property.select?.name || null;
    case 'multi_select': return property.multi_select?.map((s: any) => s.name) || [];
    case 'relation': return property.relation?.map((r: any) => r.id) || [];
    case 'people': return property.people?.map((p: any) => ({ name: p.name })) || [];
    case 'status': return property.status?.name || null;
    default: return null;
  }
}

async function fetchAllClients(): Promise<any[]> {
  console.log('📊 Fetching all clients from Notion...');
  
  const allPages: any[] = [];
  let hasMore = true;
  let cursor: string | null = null;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const response = await fetch(`https://api.notion.com/v1/databases/${CLIENTS_DB}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    allPages.push(...data.results);
    
    hasMore = data.has_more;
    cursor = data.next_cursor;
    
    process.stdout.write(`\r   Fetched ${allPages.length} clients...`);
  }

  console.log(`\n✅ Total: ${allPages.length} clients\n`);
  return allPages;
}

async function syncClients() {
  const clients = await fetchAllClients();
  
  let updated = 0;
  let errors = 0;
  const startTime = Date.now();
  
  console.log('🔄 Syncing engineer data...\n');
  
  for (let i = 0; i < clients.length; i++) {
    const page = clients[i];
    const props = page.properties;
    const name = getPropertyValue(props['Client']) || 'Unknown';
    
    // Get engineer relations
    const seIds = getPropertyValue(props['SE']) || [];
    const primaryIds = getPropertyValue(props['Primary Consultant']) || [];
    const secondaryIds = getPropertyValue(props['Secondaries']) || [];
    const grceIds = getPropertyValue(props['GRCE']) || [];
    const itManager = getPropertyValue(props['IT Manager']) || [];
    
    // Resolve names
    const seNames = getTeamMemberNames(seIds);
    const primaryNames = getTeamMemberNames(primaryIds);
    const secondaryNames = getTeamMemberNames(secondaryIds);
    const grceNames = getTeamMemberNames(grceIds);
    
    try {
      await prisma.client.update({
        where: { notionPageId: page.id },
        data: {
          systemEngineerName: seNames[0] || null,
          primaryConsultantName: primaryNames[0] || null,
          secondaryConsultantNames: secondaryNames,
          itManagerName: itManager[0]?.name || null,
          grceEngineerName: grceNames[0] || null,
        },
      });
      updated++;
    } catch (e: any) {
      errors++;
    }
    
    // Progress update every 10 clients
    if ((i + 1) % 10 === 0 || i === clients.length - 1) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\r   Progress: ${i + 1}/${clients.length} (${elapsed}s)`);
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ Sync complete in ${totalTime}s!`);
  console.log(`   Updated: ${updated}`);
  if (errors > 0) console.log(`   Errors: ${errors}`);
}

async function showStats() {
  console.log('\n📋 Database Stats:');
  
  const withSE = await prisma.client.count({ where: { systemEngineerName: { not: null } } });
  const withPrimary = await prisma.client.count({ where: { primaryConsultantName: { not: null } } });
  const withGRCE = await prisma.client.count({ where: { grceEngineerName: { not: null } } });
  const total = await prisma.client.count();
  
  console.log(`   Total clients: ${total}`);
  console.log(`   With SE assigned: ${withSE}`);
  console.log(`   With Primary Consultant: ${withPrimary}`);
  console.log(`   With GRCE: ${withGRCE}`);
  
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
    await loadTeamMembers();
    await syncClients();
    await showStats();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);




