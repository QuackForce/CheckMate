import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

/**
 * Show details about missing records from Supabase
 */

const oldDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.OLD_DATABASE_URL,
    },
  },
})

const newDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function showMissingDetails() {
  console.log('🔍 Showing details of missing records...\n')

  if (!process.env.OLD_DATABASE_URL) {
    console.error('❌ OLD_DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  // Get all records from both databases
  const oldClientSystems = await (oldDb as any).clientSystem.findMany({
    include: { Client: { select: { id: true, name: true } }, System: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const newClientSystems = await (newDb as any).clientSystem.findMany({
    include: { Client: { select: { id: true, name: true } }, System: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const newClientSystemIds = new Set(newClientSystems.map((cs: any) => cs.id))
  const missingClientSystems = oldClientSystems.filter((cs: any) => !newClientSystemIds.has(cs.id))

  console.log('📋 Missing ClientSystem Records (System Assignments):')
  console.log('='.repeat(80))
  if (missingClientSystems.length > 0) {
    for (const cs of missingClientSystems) {
      console.log(`\n  ID: ${cs.id}`)
      console.log(`  Client: ${cs.Client?.name || 'Unknown'} (${cs.clientId})`)
      console.log(`  System: ${cs.System?.name || 'Unknown'} (${cs.systemId})`)
      console.log(`  Active: ${cs.isActive}`)
      console.log(`  Notes: ${cs.notes || 'None'}`)
      console.log(`  Created: ${cs.createdAt}`)
    }
  } else {
    console.log('  No missing ClientSystem records')
  }

  // ClientEngineerAssignment
  const oldAssignments = await (oldDb as any).clientEngineerAssignment.findMany({
    include: { Client: { select: { id: true, name: true } }, User: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const newAssignments = await (newDb as any).clientEngineerAssignment.findMany({
    include: { Client: { select: { id: true, name: true } }, User: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const newAssignmentIds = new Set(newAssignments.map((a: any) => a.id))
  const missingAssignments = oldAssignments.filter((a: any) => !newAssignmentIds.has(a.id))

  console.log('\n\n📋 Missing ClientEngineerAssignment Records (User Role Assignments):')
  console.log('='.repeat(80))
  if (missingAssignments.length > 0) {
    // Group by client for easier reading
    const byClient = new Map<string, any[]>()
    for (const a of missingAssignments) {
      const clientName = a.Client?.name || 'Unknown'
      if (!byClient.has(clientName)) {
        byClient.set(clientName, [])
      }
      byClient.get(clientName)!.push(a)
    }

    for (const [clientName, assignments] of Array.from(byClient.entries())) {
      console.log(`\n  Client: ${clientName}`)
      for (const a of assignments) {
        console.log(`    - ${a.User?.name || 'Unknown'} (${a.User?.email || 'No email'}) as ${a.role}`)
        console.log(`      ID: ${a.id}, Created: ${a.createdAt}`)
      }
    }
  } else {
    console.log('  No missing ClientEngineerAssignment records')
  }

  // InfraCheck
  const oldChecks = await oldDb.infraCheck.findMany({
    include: { Client: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const newChecks = await newDb.infraCheck.findMany({
    include: { Client: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const newCheckIds = new Set(newChecks.map((c: any) => c.id))
  const missingChecks = oldChecks.filter((c: any) => !newCheckIds.has(c.id))

  console.log('\n\n📋 Missing InfraCheck Records:')
  console.log('='.repeat(80))
  if (missingChecks.length > 0) {
    for (const check of missingChecks) {
      console.log(`\n  ID: ${check.id}`)
      console.log(`  Client: ${check.Client?.name || 'Unknown'} (${check.clientId})`)
      console.log(`  Status: ${check.status}`)
      console.log(`  Created: ${check.createdAt}`)
    }
  } else {
    console.log('  No missing InfraCheck records')
  }

  // UserTeam
  const oldUserTeams = await (oldDb as any).userTeam.findMany({
    include: { User: { select: { id: true, name: true, email: true } }, Team: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const newUserTeams = await (newDb as any).userTeam.findMany({
    include: { User: { select: { id: true, name: true, email: true } }, Team: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const newUserTeamIds = new Set(newUserTeams.map((ut: any) => ut.id))
  const missingUserTeams = oldUserTeams.filter((ut: any) => !newUserTeamIds.has(ut.id))

  console.log('\n\n📋 Missing UserTeam Records (User-Team Associations):')
  console.log('='.repeat(80))
  if (missingUserTeams.length > 0) {
    // Group by team for easier reading
    const byTeam = new Map<string, any[]>()
    for (const ut of missingUserTeams) {
      const teamName = ut.Team?.name || 'Unknown'
      if (!byTeam.has(teamName)) {
        byTeam.set(teamName, [])
      }
      byTeam.get(teamName)!.push(ut)
    }

    for (const [teamName, userTeams] of Array.from(byTeam.entries())) {
      console.log(`\n  Team: ${teamName}`)
      for (const ut of userTeams) {
        console.log(`    - ${ut.User?.name || 'Unknown'} (${ut.User?.email || 'No email'})`)
        console.log(`      ID: ${ut.id}, Created: ${ut.createdAt}`)
      }
    }
  } else {
    console.log('  No missing UserTeam records')
  }

  // ClientTeam
  const oldClientTeams = await (oldDb as any).clientTeam.findMany({
    include: { Client: { select: { id: true, name: true } }, Team: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const newClientTeams = await (newDb as any).clientTeam.findMany({
    include: { Client: { select: { id: true, name: true } }, Team: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const newClientTeamIds = new Set(newClientTeams.map((ct: any) => ct.id))
  const missingClientTeams = oldClientTeams.filter((ct: any) => !newClientTeamIds.has(ct.id))

  console.log('\n\n📋 Missing ClientTeam Records (Client-Team Associations):')
  console.log('='.repeat(80))
  if (missingClientTeams.length > 0) {
    for (const ct of missingClientTeams) {
      console.log(`\n  Client: ${ct.Client?.name || 'Unknown'} (${ct.clientId})`)
      console.log(`  Team: ${ct.Team?.name || 'Unknown'} (${ct.teamId})`)
      console.log(`  ID: ${ct.id}, Created: ${ct.createdAt}`)
    }
  } else {
    console.log('  No missing ClientTeam records')
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n✅ Summary:')
  console.log(`   ClientSystem: ${missingClientSystems.length} missing`)
  console.log(`   ClientEngineerAssignment: ${missingAssignments.length} missing`)
  console.log(`   InfraCheck: ${missingChecks.length} missing`)
  console.log(`   UserTeam: ${missingUserTeams.length} missing`)
  console.log(`   ClientTeam: ${missingClientTeams.length} missing`)
  console.log(`   TOTAL: ${missingClientSystems.length + missingAssignments.length + missingChecks.length + missingUserTeams.length + missingClientTeams.length} missing records\n`)

  await oldDb.$disconnect()
  await newDb.$disconnect()
}

showMissingDetails().catch(console.error)
