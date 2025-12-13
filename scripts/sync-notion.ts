/**
 * Script to manually sync all clients from Notion
 * Run with: npx tsx scripts/sync-notion.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { syncClientsFromNotion } from '../src/lib/notion';

async function main() {
  console.log('\n🚀 Starting Notion Client Sync\n');
  console.log('═'.repeat(50));
  
  const result = await syncClientsFromNotion();
  
  console.log('\n═'.repeat(50));
  console.log('📊 SYNC RESULTS:');
  console.log('═'.repeat(50));
  console.log(`   ✅ Total Synced: ${result.synced}`);
  console.log(`   🆕 Created: ${result.created}`);
  console.log(`   🔄 Updated: ${result.updated}`);
  
  if (result.errors.length > 0) {
    console.log(`\n   ⚠️  Errors (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`      - ${error}`);
    }
  }
  
  console.log('\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});








