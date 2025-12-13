import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function consolidateTeams() {
  try {
    console.log('🔍 Finding teams to consolidate...\n')

    // Find the teams
    const team1 = await prisma.team.findUnique({
      where: { name: 'Team 1' },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
    })

    const consultantTeam1 = await prisma.team.findUnique({
      where: { name: 'Consultant Team 1' },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
    })

    if (!team1) {
      console.log('❌ "Team 1" not found')
      return
    }

    if (!consultantTeam1) {
      console.log('❌ "Consultant Team 1" not found')
      return
    }

    console.log('📊 Current state:')
    console.log(`  "Team 1": ${team1._count.clients} clients, ${team1._count.users} users`)
    console.log(`  "Consultant Team 1": ${consultantTeam1._count.clients} clients, ${consultantTeam1._count.users} users\n`)

    // Get all clients from Team 1
    const team1Clients = await prisma.clientTeam.findMany({
      where: { teamId: team1.id },
      select: { clientId: true },
    })

    console.log(`📦 Moving ${team1Clients.length} clients from "Team 1" to "Consultant Team 1"...`)

    // Move clients to Consultant Team 1
    for (const clientTeam of team1Clients) {
      // Check if client is already in Consultant Team 1
      const existing = await prisma.clientTeam.findUnique({
        where: {
          clientId_teamId: {
            clientId: clientTeam.clientId,
            teamId: consultantTeam1.id,
          },
        },
      })

      if (!existing) {
        // Create new association
        await prisma.clientTeam.create({
          data: {
            clientId: clientTeam.clientId,
            teamId: consultantTeam1.id,
          },
        })
      }

      // Remove from Team 1
      await prisma.clientTeam.delete({
        where: {
          clientId_teamId: {
            clientId: clientTeam.clientId,
            teamId: team1.id,
          },
        },
      })
    }

    console.log('✅ Clients moved\n')

    // Update Consultant Team 1 tag to "Team 1"
    console.log('🏷️  Setting tag of "Consultant Team 1" to "Team 1"...')
    await prisma.team.update({
      where: { id: consultantTeam1.id },
      data: { tag: 'Team 1' },
    })
    console.log('✅ Tag updated\n')

    // Delete Team 1 (soft delete by setting isActive to false)
    console.log('🗑️  Deactivating "Team 1"...')
    await prisma.team.update({
      where: { id: team1.id },
      data: { isActive: false },
    })
    console.log('✅ Team deactivated\n')

    // Verify final state
    const finalConsultantTeam1 = await prisma.team.findUnique({
      where: { id: consultantTeam1.id },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
    })

    console.log('📊 Final state:')
    console.log(`  "Consultant Team 1": ${finalConsultantTeam1?._count.clients} clients, ${finalConsultantTeam1?._count.users} users`)
    console.log(`  Tag: "${finalConsultantTeam1?.tag}"`)
    console.log('\n✅ Consolidation complete!')
  } catch (error) {
    console.error('❌ Error consolidating teams:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

consolidateTeams()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

