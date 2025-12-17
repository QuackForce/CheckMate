import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAssignmentStatus() {
  try {
    console.log('🔍 Checking client assignment status...\n')

    const clients = await prisma.client.findMany({
      include: {
        ClientEngineerAssignment: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log(`Total clients: ${clients.length}\n`)

    let clientsWithAssignments = 0
    let clientsWithoutAssignments = 0
    let clientsWithNameFields = 0
    let clientsWithNameFieldsButNoAssignments = 0

    for (const client of clients) {
      const assignments = client.ClientEngineerAssignment || []
      const hasAssignments = assignments.length > 0
      const hasNameFields = 
        client.systemEngineerName ||
        client.primaryConsultantName ||
        (client.secondaryConsultantNames && Array.isArray(client.secondaryConsultantNames) && client.secondaryConsultantNames.length > 0) ||
        client.grceEngineerName ||
        client.itManagerName

      if (hasAssignments) {
        clientsWithAssignments++
      } else {
        clientsWithoutAssignments++
      }

      if (hasNameFields) {
        clientsWithNameFields++
      }

      if (hasNameFields && !hasAssignments) {
        clientsWithNameFieldsButNoAssignments++
        console.log(`📌 ${client.name}`)
        console.log(`   Assignments: ${assignments.length}`)
        if (client.systemEngineerName) console.log(`   SE Name: ${client.systemEngineerName}`)
        if (client.primaryConsultantName) console.log(`   PRIMARY Name: ${client.primaryConsultantName}`)
        if (client.secondaryConsultantNames && Array.isArray(client.secondaryConsultantNames) && client.secondaryConsultantNames.length > 0) {
          console.log(`   SECONDARY Names: ${client.secondaryConsultantNames.join(', ')}`)
        }
        if (client.grceEngineerName) console.log(`   GRCE Name: ${client.grceEngineerName}`)
        if (client.itManagerName) console.log(`   IT_MANAGER Name: ${client.itManagerName}`)
        console.log('')
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   Clients with assignments: ${clientsWithAssignments}`)
    console.log(`   Clients without assignments: ${clientsWithoutAssignments}`)
    console.log(`   Clients with name fields: ${clientsWithNameFields}`)
    console.log(`   Clients with name fields but NO assignments: ${clientsWithNameFieldsButNoAssignments}`)

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error checking assignment status:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkAssignmentStatus()

