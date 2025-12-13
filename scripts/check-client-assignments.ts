import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkClientAssignments() {
  try {
    // Get all clients
    const allClients = await prisma.client.findMany({
      select: { id: true, name: true },
    })

    // Get all client-engineer assignments
    const assignments = await prisma.clientEngineerAssignment.findMany({
      select: { clientId: true, userId: true },
    })

    // Get clients with team assignments
    const teamAssignments = await prisma.clientTeam.findMany({
      select: { clientId: true },
    })

    // Create sets of client IDs that have assignments
    const clientsWithEngineerAssignments = new Set(assignments.map(a => a.clientId))
    const clientsWithTeamAssignments = new Set(teamAssignments.map(t => t.clientId))
    const clientsWithAnyAssignment = new Set([
      ...Array.from(clientsWithEngineerAssignments),
      ...Array.from(clientsWithTeamAssignments),
    ])

    // Find clients without any assignments
    const clientsWithoutAssignments = allClients.filter(
      client => !clientsWithAnyAssignment.has(client.id)
    )

    // Count assignments per client
    const assignmentCounts = new Map<string, number>()
    assignments.forEach(a => {
      assignmentCounts.set(a.clientId, (assignmentCounts.get(a.clientId) || 0) + 1)
    })

    console.log('📊 Client Assignment Report')
    console.log('='.repeat(50))
    console.log(`Total Clients: ${allClients.length}`)
    console.log(`Clients with Engineer Assignments: ${clientsWithEngineerAssignments.size}`)
    console.log(`Clients with Team Assignments: ${clientsWithTeamAssignments.size}`)
    console.log(`Clients with Any Assignment: ${clientsWithAnyAssignment.size}`)
    console.log(`Clients WITHOUT Assignments: ${clientsWithoutAssignments.length}`)
    console.log('')

    if (clientsWithoutAssignments.length > 0) {
      console.log('⚠️  Clients without any assignments:')
      clientsWithoutAssignments.forEach(client => {
        console.log(`  - ${client.name} (ID: ${client.id})`)
      })
      console.log('')
    }

    // Show distribution of assignment counts
    const assignmentDistribution = new Map<number, number>()
    allClients.forEach(client => {
      const count = assignmentCounts.get(client.id) || 0
      assignmentDistribution.set(count, (assignmentDistribution.get(count) || 0) + 1)
    })

    console.log('📈 Assignment Distribution (Engineer Assignments):')
    const sortedDist = Array.from(assignmentDistribution.entries()).sort((a, b) => a[0] - b[0])
    sortedDist.forEach(([count, numClients]) => {
      console.log(`  ${count} assignment(s): ${numClients} client(s)`)
    })

    console.log('')
    console.log('✅ Check complete!')

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkClientAssignments()

