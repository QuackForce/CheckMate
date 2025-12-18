import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding audit types...')

  // Get frameworks
  const soc2 = await prisma.framework.findUnique({ where: { name: 'SOC 2' } })
  const iso27001 = await prisma.framework.findUnique({ where: { name: 'ISO 27001' } })
  const hipaa = await prisma.framework.findUnique({ where: { name: 'HIPAA' } })

  const auditTypes = [
    // SOC 2
    ...(soc2 ? [
      { frameworkId: soc2.id, name: 'Type I', order: 1 },
      { frameworkId: soc2.id, name: 'Type II', order: 2 },
      { frameworkId: soc2.id, name: 'Surveillance', order: 3 },
    ] : []),
    
    // ISO 27001
    ...(iso27001 ? [
      { frameworkId: iso27001.id, name: 'Surveillance', order: 1 },
      { frameworkId: iso27001.id, name: 'Recertification', order: 2 },
      { frameworkId: iso27001.id, name: 'Risk Assessment', order: 3 },
    ] : []),
    
    // HIPAA
    ...(hipaa ? [
      { frameworkId: hipaa.id, name: 'Risk Assessment', order: 1 },
      { frameworkId: hipaa.id, name: 'Security Assessment', order: 2 },
    ] : []),
  ]

  for (const auditType of auditTypes) {
    await prisma.auditType.upsert({
      where: {
        frameworkId_name: {
          frameworkId: auditType.frameworkId,
          name: auditType.name,
        },
      },
      update: {
        order: auditType.order,
      },
      create: {
        id: crypto.randomUUID(),
        frameworkId: auditType.frameworkId,
        name: auditType.name,
        order: auditType.order,
      },
    })
  }

  console.log(`Seeded ${auditTypes.length} audit types`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

