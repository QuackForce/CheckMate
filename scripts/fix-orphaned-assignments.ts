import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixOrphanedAssignments() {
  try {
    console.log('🔍 Checking for orphaned user assignments...\n')

    // Get all assignments
    const allAssignments = await prisma.clientEngineerAssignment.findMany({
      select: {
        id: true,
        clientId: true,
        userId: true,
        role: true,
        Client: {
          select: {
            name: true,
          },
        },
      },
    })

    console.log(`📊 Total assignments found: ${allAssignments.length}`)

    // Get all valid user IDs
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
      },
    })
    const validUserIds = new Set(allUsers.map(u => u.id))

    // Find orphaned assignments
    const orphanedAssignments = allAssignments.filter(
      assignment => !validUserIds.has(assignment.userId)
    )

    if (orphanedAssignments.length === 0) {
      console.log('✅ No orphaned assignments found! All assignments reference valid users.')
      await prisma.$disconnect()
      return
    }

    console.log(`\n⚠️  Found ${orphanedAssignments.length} orphaned assignment(s):\n`)

    // Group by client for better reporting
    const byClient = new Map<string, typeof orphanedAssignments>()
    orphanedAssignments.forEach(assignment => {
      if (!byClient.has(assignment.clientId)) {
        byClient.set(assignment.clientId, [])
      }
      byClient.get(assignment.clientId)!.push(assignment)
    })

    // Report orphaned assignments
    Array.from(byClient.entries()).forEach(([clientId, assignments]) => {
      const client = assignments[0].Client
      console.log(`📋 Client: ${client.name} (${clientId})`)
      assignments.forEach(assignment => {
        console.log(`   - Role: ${assignment.role}, User ID: ${assignment.userId} (does not exist)`)
      })
      console.log('')
    })

    // Ask for confirmation before deleting
    console.log('🗑️  These orphaned assignments should be deleted.')
    console.log('   They reference users that no longer exist in the database.\n')

    // Delete orphaned assignments
    const assignmentIds = orphanedAssignments.map(a => a.id)
    
    console.log('🧹 Deleting orphaned assignments...')
    const result = await prisma.clientEngineerAssignment.deleteMany({
      where: {
        id: {
          in: assignmentIds,
        },
      },
    })

    console.log(`✅ Deleted ${result.count} orphaned assignment(s).\n`)

    // Verify no more orphaned assignments
    const remainingAssignments = await prisma.clientEngineerAssignment.findMany({
      where: {
        userId: {
          notIn: Array.from(validUserIds),
        },
      },
    })

    if (remainingAssignments.length > 0) {
      console.log(`⚠️  Warning: ${remainingAssignments.length} orphaned assignment(s) still remain.`)
      console.log('   This might indicate a database constraint issue.')
    } else {
      console.log('✅ All orphaned assignments have been cleaned up!')
    }

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

fixOrphanedAssignments()

