const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    process.stdout.write('Finding test item...\n')
    
    // First update it
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE "ItemResult" 
      SET notes = '(Custom item)', "source" = 'CUSTOM'
      WHERE id IN (
        SELECT ir.id
        FROM "ItemResult" ir
        JOIN "CategoryResult" cr ON ir."categoryResultId" = cr.id
        WHERE cr."checkId" = 'cmis3cjjl000lxgvkes8cuot1'
        AND LOWER(ir.text) = 'test'
      )
    `)
    
    process.stdout.write(`Updated ${updateResult} row(s)\n`)
    
    // Then delete it
    const deleteResult = await prisma.$executeRawUnsafe(`
      DELETE FROM "ItemResult"
      WHERE id IN (
        SELECT ir.id
        FROM "ItemResult" ir
        JOIN "CategoryResult" cr ON ir."categoryResultId" = cr.id
        WHERE cr."checkId" = 'cmis3cjjl000lxgvkes8cuot1'
        AND LOWER(ir.text) = 'test'
      )
    `)
    
    process.stdout.write(`Deleted ${deleteResult} row(s)\n`)
    process.stdout.write('Done!\n')
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

