import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const oldDb = new PrismaClient({
  datasources: {
    db: { url: process.env.OLD_DATABASE_URL },
  },
})

const newDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
})

async function showMissingDetails() {
  console.log('📋 Details of Missing Records to be Migrated:\n')

  // Get missing InfraCheck
  const oldChecks = await oldDb.infraCheck.findMany({ orderBy: { createdAt: 'asc' } })
  const newChecks = await newDb.infraCheck.findMany({ orderBy: { createdAt: 'asc' } })
  const newCheckIds = new Set(newChecks.map(c => c.id))
  const missingChecks = oldChecks.filter(c => !newCheckIds.has(c.id))

  if (missingChecks.length > 0) {
    console.log('🔍 MISSING INFRACHECKS (1):\n')
    for (const check of missingChecks) {
      const client = await oldDb.client.findUnique({ where: { id: check.clientId }, select: { name: true } })
      console.log(`  ID: ${check.id}`)
      console.log(`  Client: ${client?.name || check.clientId}`)
      console.log(`  Status: ${check.status}`)
      console.log(`  Scheduled Date: ${check.scheduledDate?.toISOString() || 'N/A'}`)
      console.log(`  Assigned Engineer: ${check.assignedEngineerName || 'N/A'}`)
      console.log(`  Created: ${check.createdAt.toISOString()}`)
      console.log()
    }
  }

  // Get missing ClientEngineerAssignment
  const oldAssignments = await (oldDb as any).clientEngineerAssignment.findMany({ 
    orderBy: { createdAt: 'asc' },
    include: {
      Client: { select: { name: true } },
      User: { select: { name: true, email: true } },
    },
  })
  const newAssignments = await (newDb as any).clientEngineerAssignment.findMany({ orderBy: { createdAt: 'asc' } })
  const newAssignmentIds = new Set(newAssignments.map((a: any) => a.id))
  const missingAssignments = oldAssignments.filter((a: any) => !newAssignmentIds.has(a.id))

  if (missingAssignments.length > 0) {
    console.log('👥 MISSING CLIENT ENGINEER ASSIGNMENTS (11):\n')
    for (const assignment of missingAssignments) {
      console.log(`  ID: ${assignment.id}`)
      console.log(`  Client: ${assignment.Client?.name || assignment.clientId}`)
      console.log(`  User: ${assignment.User?.name || assignment.User?.email || assignment.userId}`)
      console.log(`  Role: ${assignment.role}`)
      console.log(`  Created: ${assignment.createdAt.toISOString()}`)
      console.log()
    }
  }

  // Get missing ClientTeam
  const oldClientTeams = await (oldDb as any).clientTeam.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      Client: { select: { name: true } },
      Team: { select: { name: true } },
    },
  })
  const newClientTeams = await (newDb as any).clientTeam.findMany({ orderBy: { createdAt: 'asc' } })
  const newClientTeamIds = new Set(newClientTeams.map((ct: any) => ct.id))
  const missingClientTeams = oldClientTeams.filter((ct: any) => !newClientTeamIds.has(ct.id))

  if (missingClientTeams.length > 0) {
    console.log('🏢 MISSING CLIENT TEAM ASSIGNMENTS (2):\n')
    for (const ct of missingClientTeams) {
      console.log(`  ID: ${ct.id}`)
      console.log(`  Client: ${ct.Client?.name || ct.clientId}`)
      console.log(`  Team: ${ct.Team?.name || ct.teamId}`)
      console.log(`  Created: ${ct.createdAt.toISOString()}`)
      console.log()
    }
  }

  await oldDb.$disconnect()
  await newDb.$disconnect()
}

showMissingDetails().catch(console.error)

