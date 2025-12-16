import { CheckExecution } from '@/components/checks/check-execution'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'

async function getCheck(id: string) {
  const check = await db.infraCheck.findUnique({
    where: { id },
    include: {
      Client: {
        select: {
          id: true,
          name: true,
          slackChannelName: true,
          slackChannelId: true,
          customCadenceDays: true,
          checkCadence: true,
        },
      },
      User_InfraCheck_assignedEngineerIdToUser: {
        select: {
          id: true,
          name: true,
          email: true,
          slackUsername: true,
          slackUserId: true,
        },
      },
      CategoryResult: {
        include: {
          ItemResult: {
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
  if (check.CategoryResult.length > 0) {
    return {
      ...check,
      categories: check.CategoryResult.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: 'clipboard', // Default icon
        status: cat.status,
        notes: cat.notes || '',
        items: cat.ItemResult.map(item => ({
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
      System: {
        include: {
          SystemCheckItem: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
    orderBy: {
      System: { category: 'asc' },
    },
  })

  // Build categories from client's systems
  const categories = clientSystems.map(cs => ({
    id: cs.System.id,
    name: cs.System.name,
    icon: cs.System.icon || 'clipboard',
    status: 'pending',
    notes: '',
    items: cs.System.SystemCheckItem.map(item => ({
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
  let slackUserId = check.User_InfraCheck_assignedEngineerIdToUser?.slackUserId || null
  let slackUsername = check.User_InfraCheck_assignedEngineerIdToUser?.slackUsername || null

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
    }
  }

  // Transform to the format expected by CheckExecution
  // Use assignedEngineerName if assignedEngineer relation is not set
  const checkData = {
    id: check.id,
      Client: {
        id: check.Client.id,
        name: check.Client.name,
        slackChannelName: check.Client.slackChannelName,
        slackChannelId: check.Client.slackChannelId,
        customCadenceDays: check.Client.customCadenceDays,
        checkCadence: check.Client.checkCadence,
      },
    assignedEngineer: {
      id: check.User_InfraCheck_assignedEngineerIdToUser?.id || '',
      name: check.User_InfraCheck_assignedEngineerIdToUser?.name || check.assignedEngineerName || 'Unassigned',
      email: check.User_InfraCheck_assignedEngineerIdToUser?.email || '',
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
