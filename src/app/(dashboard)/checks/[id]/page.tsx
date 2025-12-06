import { CheckExecution } from '@/components/checks/check-execution'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

async function getCheck(id: string) {
  const check = await db.infraCheck.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          slackChannelName: true,
          slackChannelId: true,
        },
      },
      assignedEngineer: {
        select: {
          id: true,
          name: true,
          email: true,
          slackUsername: true,
          slackUserId: true,
        },
      },
      categoryResults: {
        include: {
          items: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!check) return null

  // If check has saved category results, use them
  // Otherwise, we need to build from client's systems
  if (check.categoryResults.length > 0) {
    return {
      ...check,
      categories: check.categoryResults.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: 'clipboard', // Default icon
        status: cat.status,
        notes: cat.notes || '',
        items: cat.items.map(item => ({
          id: item.id,
          text: item.text,
          checked: item.checked,
          notes: item.notes || '',
        })),
      })),
    }
  }

  // If no saved results, get client's systems
  const clientSystems = await db.clientSystem.findMany({
    where: { 
      clientId: check.clientId,
      isActive: true,
    },
    include: {
      system: {
        include: {
          checkItems: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
    orderBy: {
      system: { category: 'asc' },
    },
  })

  // Build categories from client's systems
  const categories = clientSystems.map(cs => ({
    id: cs.system.id,
    name: cs.system.name,
    icon: cs.system.icon || 'clipboard',
    status: 'pending',
    notes: '',
    items: cs.system.checkItems.map(item => ({
      id: item.id,
      text: item.text,
      checked: false,
      notes: '',
      isOptional: item.isOptional,
    })),
  }))

  return {
    ...check,
    categories,
  }
}

export default async function CheckPage({ params }: { params: { id: string } }) {
  const check = await getCheck(params.id)

  if (!check) {
    notFound()
  }

  // If check doesn't have assignedEngineer relation but has assignedEngineerName,
  // try to look up the user by name to get their slackUserId
  let slackUserId = check.assignedEngineer?.slackUserId || null
  let slackUsername = check.assignedEngineer?.slackUsername || null
  
  if (!slackUserId && check.assignedEngineerName) {
    // Try to find user by name (exact match first, then contains)
    const userByName = await db.user.findFirst({
      where: {
        OR: [
          { name: check.assignedEngineerName },
          { name: { contains: check.assignedEngineerName, mode: 'insensitive' } },
        ],
      },
      select: {
        slackUserId: true,
        slackUsername: true,
        name: true,
      },
    })
    
    if (userByName) {
      slackUserId = userByName.slackUserId
      slackUsername = userByName.slackUsername
      console.log(`Found user by name lookup: ${userByName.name}, slackUserId: ${slackUserId}`)
    } else {
      console.log(`No user found for assignedEngineerName: ${check.assignedEngineerName}`)
    }
  }

  // Transform to the format expected by CheckExecution
  // Use assignedEngineerName if assignedEngineer relation is not set
  const checkData = {
    id: check.id,
    client: {
      id: check.client.id,
      name: check.client.name,
      slackChannelName: check.client.slackChannelName,
      slackChannelId: check.client.slackChannelId,
    },
    assignedEngineer: {
      id: check.assignedEngineer?.id || '',
      name: check.assignedEngineer?.name || check.assignedEngineerName || 'Unassigned',
      email: check.assignedEngineer?.email || '',
      slackUsername: slackUsername,
      slackUserId: slackUserId,
    },
    scheduledDate: check.scheduledDate,
    status: check.status,
    cadence: check.cadence,
    totalTimeSeconds: check.totalTimeSeconds,
    calendarEventLink: check.calendarEventLink,
    categories: check.categories,
  }

  return <CheckExecution check={checkData} />
}
