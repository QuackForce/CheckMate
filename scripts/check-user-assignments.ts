import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUserAssignments() {
  try {
    // Find Michael Lemay
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Michael', mode: 'insensitive' } },
          { name: { contains: 'Lemay', mode: 'insensitive' } },
          { email: { contains: 'michael', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!user) {
      console.log('❌ User not found')
      await prisma.$disconnect()
      return
    }

    console.log(`👤 User: ${user.name}`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   ID: ${user.id}`)
    console.log('')

    // Get all engineer assignments for this user
    const engineerAssignments = await prisma.clientEngineerAssignment.findMany({
      where: { userId: user.id },
      select: {
        clientId: true,
        role: true,
        client: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    })

    // Get unique client IDs
    const uniqueClientIds = new Set(engineerAssignments.map(a => a.clientId))
    const totalClients = uniqueClientIds.size

    console.log('📊 Assignment Summary')
    console.log('='.repeat(50))
    console.log(`Total Unique Clients: ${totalClients}`)
    console.log(`Total Assignments: ${engineerAssignments.length}`)
    console.log('')

    // Group by role
    const byRole = new Map<string, number>()
    engineerAssignments.forEach(a => {
      byRole.set(a.role, (byRole.get(a.role) || 0) + 1)
    })

    console.log('📋 Assignments by Role:')
    const roles = ['PRIMARY', 'SECONDARY', 'SYSTEM_ENGINEER', 'GRC_ENGINEER', 'IT_MANAGER']
    roles.forEach(role => {
      const count = byRole.get(role) || 0
      if (count > 0) {
        console.log(`  ${role}: ${count}`)
      }
    })
    console.log('')

    // Get team assignments
    const userTeams = await prisma.userTeam.findMany({
      where: { userId: user.id },
      select: {
        team: {
          select: {
            id: true,
            name: true,
            tag: true,
            _count: {
              select: { clients: true },
            },
          },
        },
      },
    })

    if (userTeams.length > 0) {
      console.log('👥 Team Memberships:')
      userTeams.forEach(ut => {
        console.log(`  - ${ut.team.name}${ut.team.tag ? ` (${ut.team.tag})` : ''}: ${ut.team._count.clients} clients`)
      })
      console.log('')
    }

    // Show sample of clients
    console.log('📝 Sample Clients (first 10):')
    const sampleClients = Array.from(uniqueClientIds).slice(0, 10)
    const clientDetails = engineerAssignments
      .filter(a => sampleClients.includes(a.clientId))
      .reduce((acc, a) => {
        if (!acc.has(a.clientId)) {
          acc.set(a.clientId, {
            name: a.client.name,
            status: a.client.status,
            roles: [],
          })
        }
        acc.get(a.clientId)!.roles.push(a.role)
        return acc
      }, new Map())

    clientDetails.forEach((details, clientId) => {
      console.log(`  - ${details.name} (${details.status}) - Roles: ${details.roles.join(', ')}`)
    })

    if (totalClients > 10) {
      console.log(`  ... and ${totalClients - 10} more clients`)
    }

    console.log('')
    console.log('✅ Check complete!')

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkUserAssignments()

