/**
 * Add engineer name columns via raw SQL
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Adding engineer columns to Client table...\n');

    // Add columns one by one
    const columns = [
      { name: 'systemEngineerName', type: 'TEXT' },
      { name: 'primaryConsultantName', type: 'TEXT' },
      { name: 'secondaryConsultantNames', type: 'TEXT[]', default: "'{}'" },
      { name: 'itManagerName', type: 'TEXT' },
      { name: 'grceEngineerName', type: 'TEXT' },
    ];

    for (const col of columns) {
      try {
        const sql = col.default 
          ? `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type} DEFAULT ${col.default}`
          : `ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type}`;
        
        await prisma.$executeRawUnsafe(sql);
        console.log(`✅ Added column: ${col.name}`);
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log(`⏭️  Column already exists: ${col.name}`);
        } else {
          console.log(`❌ Error adding ${col.name}: ${e.message}`);
        }
      }
    }

    console.log('\n✅ Done!');
    
    // Verify
    const sample = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Client' 
      AND column_name IN ('systemEngineerName', 'primaryConsultantName', 'itManagerName')
    `;
    console.log('\nVerification:', sample);

  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);


