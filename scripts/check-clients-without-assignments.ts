import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkClientsWithoutAssignments() {
  try {
    console.log('🔍 Checking clients without assignments...\n')

    const clients = await prisma.client.findMany({
      include: {
        ClientEngineerAssignment: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    const clientsWithoutAssignments = clients.filter(
      client => (client.ClientEngineerAssignment || []).length === 0
    )

    if (clientsWithoutAssignments.length === 0) {
      console.log('✅ All clients have assignments!')
    } else {
      console.log(`Found ${clientsWithoutAssignments.length} client(s) without assignments:\n`)
      
      for (const client of clientsWithoutAssignments) {
        console.log(`📌 ${client.name} (${client.id})`)
        console.log(`   System Engineer: ${client.systemEngineerName || 'None'}`)
        console.log(`   Primary Consultant: ${client.primaryConsultantName || 'None'}`)
        console.log(`   Secondary Consultants: ${client.secondaryConsultantNames?.join(', ') || 'None'}`)
        console.log(`   GRCE Engineer: ${client.grceEngineerName || 'None'}`)
        console.log(`   IT Manager: ${client.itManagerName || 'None'}`)
        console.log(`   Updated: ${client.updatedAt}`)
        console.log('')
      }
    }

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkClientsWithoutAssignments()

