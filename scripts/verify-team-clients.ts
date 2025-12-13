import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyTeamClients() {
  try {
    console.log('🔍 Verifying team client assignments...\n')

    // Get all active teams
    const teams = await prisma.team.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
        clients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    console.log(`📊 Found ${teams.length} active teams:\n`)

    // Summary table
    const summary: Array<{
      teamName: string
      clientCount: number
      userCount: number
      clients: Array<{ name: string; status: string }>
    }> = []

    for (const team of teams) {
      const clients = team.clients.map((ct: any) => ({
        name: ct.client.name,
        status: ct.client.status,
      }))

      summary.push({
        teamName: team.name,
        clientCount: team._count.clients,
        userCount: team._count.users,
        clients,
      })

      console.log(`\n📋 ${team.name}`)
      console.log(`   Tag: ${team.tag || 'None'}`)
      console.log(`   Manager: ${team.managerId ? 'Set' : 'Not set'}`)
      console.log(`   Users: ${team._count.users}`)
      console.log(`   Clients: ${team._count.clients}`)
      
      if (clients.length > 0) {
        console.log(`   Client list:`)
        clients.forEach((client, idx) => {
          console.log(`     ${idx + 1}. ${client.name} (${client.status})`)
        })
      } else {
        console.log(`   ⚠️  No clients assigned`)
      }
    }

    // Check for clients without teams
    console.log(`\n\n🔍 Checking for clients without teams...`)
    const clientsWithoutTeams = await prisma.client.findMany({
      where: {
        teamAssignments: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    })

    if (clientsWithoutTeams.length > 0) {
      console.log(`\n⚠️  Found ${clientsWithoutTeams.length} clients without teams:`)
      clientsWithoutTeams.forEach((client, idx) => {
        console.log(`   ${idx + 1}. ${client.name} (${client.status})`)
      })
    } else {
      console.log(`✅ All clients are assigned to teams`)
    }

    // Summary
    console.log(`\n\n📊 Summary:`)
    console.log(`   Total teams: ${teams.length}`)
    console.log(`   Total clients assigned: ${teams.reduce((sum, t) => sum + t._count.clients, 0)}`)
    console.log(`   Clients without teams: ${clientsWithoutTeams.length}`)
    console.log(`   Teams with managers: ${teams.filter(t => t.managerId).length}`)
    console.log(`   Teams without managers: ${teams.filter(t => !t.managerId).length}`)

  } catch (error) {
    console.error('❌ Error verifying team clients:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyTeamClients()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

