import { PrismaClient, ClientEngineerRole } from '@prisma/client'

const prisma = new PrismaClient()

async function recoverClientAssignments() {
  try {
    console.log('🔍 Finding clients with name fields but missing assignments...\n')

    // Find all clients that have name fields but no assignments
    const clients = await prisma.client.findMany({
      include: {
        ClientEngineerAssignment: true,
      },
    })

    const clientsToRecover: Array<{
      client: any
      assignmentsToCreate: Array<{
        id: string
        clientId: string
        userId: string
        role: ClientEngineerRole
        updatedAt: Date
      }>
    }> = []

    // Get all users for name lookup
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Create a map of user names to user IDs (case-insensitive)
    const userMap = new Map<string, string>()
    allUsers.forEach(user => {
      if (user.name) {
        const normalizedName = user.name.toLowerCase().trim()
        // Store both exact match and first name match
        userMap.set(normalizedName, user.id)
        const firstName = normalizedName.split(' ')[0]
        if (firstName && firstName !== normalizedName) {
          // Only add first name if it's not already mapped to a different user
          if (!userMap.has(firstName)) {
            userMap.set(firstName, user.id)
          }
        }
      }
    })

    // Helper to find user ID by name
    const findUserIdByName = (name: string | null): string | null => {
      if (!name) return null
      const normalized = name.toLowerCase().trim()
      
      // Try exact match first
      if (userMap.has(normalized)) {
        return userMap.get(normalized)!
      }
      
      // Try first name match
      const firstName = normalized.split(' ')[0]
      if (userMap.has(firstName)) {
        return userMap.get(firstName)!
      }
      
      // Try partial match
      for (const [userName, userId] of Array.from(userMap.entries())) {
        if (userName.includes(normalized) || normalized.includes(userName)) {
          return userId
        }
      }
      
      return null
    }

    for (const client of clients) {
      const existingAssignments = client.ClientEngineerAssignment || []
      const hasAssignments = existingAssignments.length > 0
      
      // Check if client has name fields but no assignments
      const hasNameFields = 
        client.systemEngineerName ||
        client.primaryConsultantName ||
        (client.secondaryConsultantNames && client.secondaryConsultantNames.length > 0) ||
        client.grceEngineerName ||
        client.itManagerName

      if (hasNameFields && !hasAssignments) {
        const assignmentsToCreate: Array<{
          id: string
          clientId: string
          userId: string
          role: ClientEngineerRole
          updatedAt: Date
        }> = []

        // Recover SE assignment
        if (client.systemEngineerName) {
          const userId = findUserIdByName(client.systemEngineerName)
          if (userId) {
            assignmentsToCreate.push({
              id: crypto.randomUUID(),
              clientId: client.id,
              userId,
              role: ClientEngineerRole.SE,
              updatedAt: new Date(),
            })
            console.log(`  ✓ SE: ${client.systemEngineerName} → ${userId}`)
          } else {
            console.log(`  ✗ SE: ${client.systemEngineerName} (user not found)`)
          }
        }

        // Recover PRIMARY assignment
        if (client.primaryConsultantName) {
          const userId = findUserIdByName(client.primaryConsultantName)
          if (userId) {
            assignmentsToCreate.push({
              id: crypto.randomUUID(),
              clientId: client.id,
              userId,
              role: ClientEngineerRole.PRIMARY,
              updatedAt: new Date(),
            })
            console.log(`  ✓ PRIMARY: ${client.primaryConsultantName} → ${userId}`)
          } else {
            console.log(`  ✗ PRIMARY: ${client.primaryConsultantName} (user not found)`)
          }
        }

        // Recover SECONDARY assignments
        if (client.secondaryConsultantNames && Array.isArray(client.secondaryConsultantNames)) {
          for (const name of client.secondaryConsultantNames) {
            const userId = findUserIdByName(name)
            if (userId) {
              assignmentsToCreate.push({
                id: crypto.randomUUID(),
                clientId: client.id,
                userId,
                role: ClientEngineerRole.SECONDARY,
                updatedAt: new Date(),
              })
              console.log(`  ✓ SECONDARY: ${name} → ${userId}`)
            } else {
              console.log(`  ✗ SECONDARY: ${name} (user not found)`)
            }
          }
        }

        // Recover GRCE assignment
        if (client.grceEngineerName) {
          const userId = findUserIdByName(client.grceEngineerName)
          if (userId) {
            assignmentsToCreate.push({
              id: crypto.randomUUID(),
              clientId: client.id,
              userId,
              role: ClientEngineerRole.GRCE,
              updatedAt: new Date(),
            })
            console.log(`  ✓ GRCE: ${client.grceEngineerName} → ${userId}`)
          } else {
            console.log(`  ✗ GRCE: ${client.grceEngineerName} (user not found)`)
          }
        }

        // Recover IT_MANAGER assignment
        if (client.itManagerName) {
          const userId = findUserIdByName(client.itManagerName)
          if (userId) {
            assignmentsToCreate.push({
              id: crypto.randomUUID(),
              clientId: client.id,
              userId,
              role: ClientEngineerRole.IT_MANAGER,
              updatedAt: new Date(),
            })
            console.log(`  ✓ IT_MANAGER: ${client.itManagerName} → ${userId}`)
          } else {
            console.log(`  ✗ IT_MANAGER: ${client.itManagerName} (user not found)`)
          }
        }

        if (assignmentsToCreate.length > 0) {
          clientsToRecover.push({
            client,
            assignmentsToCreate,
          })
        }
      }
    }

    if (clientsToRecover.length === 0) {
      console.log('✅ No clients found that need assignment recovery.\n')
      await prisma.$disconnect()
      return
    }

    console.log(`\n📋 Found ${clientsToRecover.length} client(s) that need assignment recovery:\n`)

    for (const { client, assignmentsToCreate } of clientsToRecover) {
      console.log(`\n📌 Client: ${client.name} (${client.id})`)
      console.log(`   Will create ${assignmentsToCreate.length} assignment(s)`)
    }

    // Ask for confirmation
    console.log('\n⚠️  This will create assignment records based on name fields.')
    console.log('   Review the assignments above before proceeding.\n')

    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer: string = await new Promise((resolve) => {
      readline.question('Do you want to recover these assignments? (yes/no): ', resolve)
    })

    readline.close()

    if (answer.toLowerCase() === 'yes') {
      let totalCreated = 0
      for (const { client, assignmentsToCreate } of clientsToRecover) {
        try {
          await prisma.clientEngineerAssignment.createMany({
            data: assignmentsToCreate,
            skipDuplicates: true,
          })
          totalCreated += assignmentsToCreate.length
          console.log(`✅ Recovered ${assignmentsToCreate.length} assignment(s) for ${client.name}`)
        } catch (error: any) {
          console.error(`❌ Error recovering assignments for ${client.name}:`, error.message)
        }
      }
      console.log(`\n🎉 Successfully recovered ${totalCreated} assignment(s) across ${clientsToRecover.length} client(s).`)
    } else {
      console.log('Operation cancelled. No assignments were recovered.')
    }

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('❌ Error recovering client assignments:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

recoverClientAssignments()

