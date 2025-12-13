import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function consolidateAllTeams() {
  try {
    console.log('🔍 Finding all teams to consolidate...\n')

    // Get all active teams
    const allTeams = await prisma.team.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    console.log(`📋 Found ${allTeams.length} active teams:\n`)
    allTeams.forEach(team => {
      console.log(`  - "${team.name}": ${team._count.clients} clients, ${team._count.users} users`)
    })
    console.log()

    // Find teams that match the pattern: "Team X" and "Consultant Team X"
    const teamPattern = /^Team (\d+)$/i
    const consultantTeamPattern = /^Consultant Team (\d+)$/i

    const teamsToConsolidate: Array<{
      teamNumber: string
      team: typeof allTeams[0]
      consultantTeam: typeof allTeams[0]
    }> = []

    for (const team of allTeams) {
      const teamMatch = team.name.match(teamPattern)
      if (teamMatch) {
        const teamNumber = teamMatch[1]
        const consultantTeam = allTeams.find(t => {
          const consultantMatch = t.name.match(consultantTeamPattern)
          return consultantMatch && consultantMatch[1] === teamNumber
        })

        if (consultantTeam) {
          teamsToConsolidate.push({
            teamNumber,
            team,
            consultantTeam,
          })
        }
      }
    }

    if (teamsToConsolidate.length === 0) {
      console.log('✅ No teams found that match the consolidation pattern (Team X + Consultant Team X)')
      return
    }

    console.log(`🔄 Found ${teamsToConsolidate.length} team pairs to consolidate:\n`)
    teamsToConsolidate.forEach(({ teamNumber, team, consultantTeam }) => {
      console.log(`  - "Team ${teamNumber}" (${team._count.clients} clients, ${team._count.users} users)`)
      console.log(`    → "Consultant Team ${teamNumber}" (${consultantTeam._count.clients} clients, ${consultantTeam._count.users} users)`)
    })
    console.log()

    // Consolidate each pair
    for (const { teamNumber, team, consultantTeam } of teamsToConsolidate) {
      console.log(`\n🔄 Consolidating Team ${teamNumber}...`)

      // Get all clients from the simple "Team X"
      const teamClients = await prisma.clientTeam.findMany({
        where: { teamId: team.id },
        select: { clientId: true },
      })

      if (teamClients.length > 0) {
        console.log(`  📦 Moving ${teamClients.length} clients from "Team ${teamNumber}" to "Consultant Team ${teamNumber}"...`)

        // Move clients to Consultant Team
        for (const clientTeam of teamClients) {
          // Check if client is already in Consultant Team
          const existing = await prisma.clientTeam.findUnique({
            where: {
              clientId_teamId: {
                clientId: clientTeam.clientId,
                teamId: consultantTeam.id,
              },
            },
          })

          if (!existing) {
            // Create new association
            await prisma.clientTeam.create({
              data: {
                clientId: clientTeam.clientId,
                teamId: consultantTeam.id,
              },
            })
          }

          // Remove from simple Team
          await prisma.clientTeam.delete({
            where: {
              clientId_teamId: {
                clientId: clientTeam.clientId,
                teamId: team.id,
              },
            },
          })
        }
        console.log(`  ✅ Clients moved`)
      }

      // Update Consultant Team tag to "Team X"
      if (!consultantTeam.tag || consultantTeam.tag !== `Team ${teamNumber}`) {
        console.log(`  🏷️  Setting tag of "Consultant Team ${teamNumber}" to "Team ${teamNumber}"...`)
        await prisma.team.update({
          where: { id: consultantTeam.id },
          data: { tag: `Team ${teamNumber}` },
        })
        console.log(`  ✅ Tag updated`)
      }

      // Deactivate the simple "Team X"
      console.log(`  🗑️  Deactivating "Team ${teamNumber}"...`)
      await prisma.team.update({
        where: { id: team.id },
        data: { isActive: false },
      })
      console.log(`  ✅ Team deactivated`)
    }

    // Show final state
    console.log(`\n📊 Final state after consolidation:\n`)
    const finalTeams = await prisma.team.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    finalTeams.forEach(team => {
      const tagInfo = team.tag ? ` (tag: "${team.tag}")` : ''
      console.log(`  - "${team.name}": ${team._count.clients} clients, ${team._count.users} users${tagInfo}`)
    })

    console.log(`\n✅ All consolidations complete!`)
  } catch (error) {
    console.error('❌ Error consolidating teams:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

consolidateAllTeams()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

