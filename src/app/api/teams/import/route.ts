import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeamManager } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// POST /api/teams/import - Import existing teams from database
export async function POST(request: NextRequest) {
  try {
    const { error } = await requireTeamManager()
    if (error) return error

    console.log('🚀 Starting team import...')

    // Step 1: Collect all unique team names from clients
    const clients = await db.client.findMany({
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

    // Step 2: Collect all unique team names from users
    const users = await db.user.findMany({
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

    // Step 3: Combine all unique team names
    const allTeamNames = new Set([...Array.from(clientTeamNames), ...Array.from(userTeamNames)])

    if (allTeamNames.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No teams found in existing data',
        created: 0,
        existing: 0,
        clientLinks: 0,
        userLinks: 0,
      })
    }

    // Step 4: Create Team records
    const teamRecords = new Map<string, string>() // team name -> team id
    let createdCount = 0
    let existingCount = 0

    for (const teamName of Array.from(allTeamNames)) {
      try {
        // Check if team already exists
        const existing = await (db as any).team.findUnique({
          where: { name: teamName },
        })

        if (existing) {
          teamRecords.set(teamName, existing.id)
          existingCount++
        } else {
          // Create new team
          const team = await (db as any).team.create({
            data: {
              name: teamName,
              description: null,
              color: null,
              isActive: true,
            },
          })
          teamRecords.set(teamName, team.id)
          createdCount++
        }
      } catch (error: any) {
        console.error(`Failed to create team "${teamName}":`, error.message)
      }
    }

    // Step 5: Create ClientTeam join records
    let clientTeamLinks = 0
    let clientTeamSkipped = 0

    for (const [clientId, teamNames] of Array.from(clientTeamMap.entries())) {
      for (const teamName of teamNames) {
        const teamId = teamRecords.get(teamName)
        if (teamId) {
          try {
            await (db as any).clientTeam.create({
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
              console.error(`Failed to link client ${clientId} to team ${teamName}:`, error.message)
            }
          }
        }
      }
    }

    // Step 6: Create UserTeam join records
    let userTeamLinks = 0
    let userTeamSkipped = 0

    for (const [userId, teamNames] of Array.from(userTeamMap.entries())) {
      for (const teamName of teamNames) {
        const teamId = teamRecords.get(teamName)
        if (teamId) {
          try {
            await (db as any).userTeam.create({
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
              console.error(`Failed to link user ${userId} to team ${teamName}:`, error.message)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${createdCount} new teams, ${existingCount} already existed. Created ${clientTeamLinks} client links and ${userTeamLinks} user links.`,
      created: createdCount,
      existing: existingCount,
      clientLinks: clientTeamLinks,
      userLinks: userTeamLinks,
    })
  } catch (error: any) {
    console.error('Error importing teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import teams' },
      { status: 500 }
    )
  }
}

