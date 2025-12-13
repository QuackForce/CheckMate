/**
 * Migration script to convert existing string teams to Team records
 * 
 * This script:
 * 1. Extracts unique team names from Client.teams (String[])
 * 2. Extracts unique team names from User.team (comma-separated String)
 * 3. Creates Team records for each unique team name
 * 4. Creates ClientTeam join records to link clients to teams
 * 5. Creates UserTeam join records to link users to teams
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting team migration...\n')

  try {
    // Step 1: Collect all unique team names from clients
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, teams: true },
    })

    const clientTeamNames = new Set<string>()
    const clientTeamMap = new Map<string, string[]>() // clientId -> team names

    clients.forEach(client => {
      if (client.teams && Array.isArray(client.teams)) {
        client.teams.forEach(teamName => {
          if (teamName && teamName.trim()) {
            const trimmed = teamName.trim()
            clientTeamNames.add(trimmed)
            if (!clientTeamMap.has(client.id)) {
              clientTeamMap.set(client.id, [])
            }
            clientTeamMap.get(client.id)!.push(trimmed)
          }
        })
      }
    })

    console.log(`📋 Found ${clientTeamNames.size} unique team names from clients`)
    console.log(`   Teams: ${Array.from(clientTeamNames).join(', ')}\n`)

    // Step 2: Collect all unique team names from users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, team: true },
    })

    const userTeamNames = new Set<string>()
    const userTeamMap = new Map<string, string[]>() // userId -> team names

    users.forEach(user => {
      if (user.team) {
        const teams = user.team.split(',').map(t => t.trim()).filter(Boolean)
        teams.forEach(teamName => {
          userTeamNames.add(teamName)
          if (!userTeamMap.has(user.id)) {
            userTeamMap.set(user.id, [])
          }
          userTeamMap.get(user.id)!.push(teamName)
        })
      }
    })

    console.log(`👥 Found ${userTeamNames.size} unique team names from users`)
    console.log(`   Teams: ${Array.from(userTeamNames).join(', ')}\n`)

    // Step 3: Combine all unique team names
    const allTeamNames = new Set([...Array.from(clientTeamNames), ...Array.from(userTeamNames)])
    console.log(`✨ Total unique teams to create: ${allTeamNames.size}\n`)

    if (allTeamNames.size === 0) {
      console.log('ℹ️  No teams found in existing data. Nothing to migrate.')
      return
    }

    // Step 4: Create Team records
    const teamRecords = new Map<string, string>() // team name -> team id
    const createdTeams: string[] = []
    const existingTeams: string[] = []

    for (const teamName of Array.from(allTeamNames)) {
      try {
        // Check if team already exists
        const existing = await (prisma as any).team.findUnique({
          where: { name: teamName },
        })

        if (existing) {
          teamRecords.set(teamName, existing.id)
          existingTeams.push(teamName)
          console.log(`✓ Team "${teamName}" already exists (ID: ${existing.id})`)
        } else {
          // Create new team
          const team = await (prisma as any).team.create({
            data: {
              name: teamName,
              description: null,
              color: null,
              isActive: true,
            },
          })
          teamRecords.set(teamName, team.id)
          createdTeams.push(teamName)
          console.log(`✓ Created team "${teamName}" (ID: ${team.id})`)
        }
      } catch (error: any) {
        console.error(`✗ Failed to create team "${teamName}":`, error.message)
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`   Created: ${createdTeams.length} teams`)
    console.log(`   Already existed: ${existingTeams.length} teams\n`)

    // Step 5: Create ClientTeam join records
    let clientTeamLinks = 0
    let clientTeamSkipped = 0

    for (const [clientId, teamNames] of Array.from(clientTeamMap.entries())) {
      for (const teamName of Array.from(teamNames)) {
        const teamId = teamRecords.get(teamName)
        if (teamId) {
          try {
            await (prisma as any).clientTeam.create({
              data: {
                clientId,
                teamId,
              },
            })
            clientTeamLinks++
          } catch (error: any) {
            // Skip if already exists (unique constraint)
            if (error.code === 'P2002') {
              clientTeamSkipped++
            } else {
              console.error(`✗ Failed to link client ${clientId} to team ${teamName}:`, error.message)
            }
          }
        }
      }
    }

    console.log(`🔗 Client-Team links:`)
    console.log(`   Created: ${clientTeamLinks} links`)
    if (clientTeamSkipped > 0) {
      console.log(`   Skipped (already exist): ${clientTeamSkipped} links`)
    }

    // Step 6: Create UserTeam join records
    let userTeamLinks = 0
    let userTeamSkipped = 0

    for (const [userId, teamNames] of Array.from(userTeamMap.entries())) {
      for (const teamName of Array.from(teamNames)) {
        const teamId = teamRecords.get(teamName)
        if (teamId) {
          try {
            await (prisma as any).userTeam.create({
              data: {
                userId,
                teamId,
              },
            })
            userTeamLinks++
          } catch (error: any) {
            // Skip if already exists (unique constraint)
            if (error.code === 'P2002') {
              userTeamSkipped++
            } else {
              console.error(`✗ Failed to link user ${userId} to team ${teamName}:`, error.message)
            }
          }
        }
      }
    }

    console.log(`\n👥 User-Team links:`)
    console.log(`   Created: ${userTeamLinks} links`)
    if (userTeamSkipped > 0) {
      console.log(`   Skipped (already exist): ${userTeamSkipped} links`)
    }

    console.log(`\n✅ Migration complete!`)
    console.log(`\n📝 Next steps:`)
    console.log(`   1. Review teams at /settings/teams`)
    console.log(`   2. Add descriptions and colors to teams as needed`)
    console.log(`   3. The old teams String[] field on clients is still there for backward compatibility`)
    console.log(`   4. You can now use the new Team model going forward`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

