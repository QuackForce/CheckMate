import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ClientDetailView } from '@/components/clients/client-detail-view'

interface ClientPageProps {
  params: { id: string }
}

async function getClient(id: string) {
  const [client, teamAssignments, allUsers] = await Promise.all([
    db.client.findUnique({
      where: { id },
      include: {
        User_Client_primaryEngineerIdToUser: true,
        User_Client_secondaryEngineerIdToUser: true,
        // Include assignments from ClientEngineerAssignment table
        ClientEngineerAssignment: {
          select: {
            id: true,
            userId: true,
            role: true,
            User: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: [
            { role: 'asc' },
            { User: { name: 'asc' } },
          ],
        },
        InfraCheck: {
          take: 5,
          orderBy: { scheduledDate: 'desc' },
        },
      },
    }),
    // Fetch team assignments separately (with error handling)
    (async () => {
      try {
        const teamAssignments = await (db as any).clientTeam.findMany({
          where: { clientId: id },
          select: {
            id: true,
            teamId: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
                tag: true,
              },
            },
          },
        })
        return teamAssignments
      } catch (error: any) {
        console.warn('Error fetching team assignments:', error.message)
        return []
      }
    })(),
    // Fetch all users once for lookup (optimization)
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    }),
  ])
  
  if (!client) return null
  
  // Filter out orphaned assignments (where user is null - user was deleted but assignment wasn't)
  const validAssignments = client.ClientEngineerAssignment?.filter(a => a.User !== null) || []
  
  // Look up the infra check assignee user by name if set (using in-memory lookup)
  // Priority: 1) infraCheckAssigneeName override, 2) SE from assignments table, 3) legacy systemEngineerName
  let infraCheckAssigneeUser = null
  const seAssignments = validAssignments.filter(a => a.role === 'SE') || []
  const seFromAssignments = seAssignments.length > 0 ? seAssignments[0].user : null
  const assigneeName = (client.infraCheckAssigneeName || seFromAssignments?.name || client.systemEngineerName)?.trim()
  
  // If we have SE from assignments, use that user directly
  if (seFromAssignments && !client.infraCheckAssigneeName) {
    infraCheckAssigneeUser = seFromAssignments
  } else if (assigneeName) {
    const normalizedAssigneeName = assigneeName.toLowerCase()
    
    // First try exact match
    let user = allUsers.find(u => 
      u.name?.toLowerCase().trim() === normalizedAssigneeName
    )
    
    // If no exact match, try starts with
    if (!user) {
      user = allUsers.find(u => 
        u.name?.toLowerCase().trim().startsWith(normalizedAssigneeName)
      )
    }
    
    // If still no match and name is long enough, try contains
    if (!user && assigneeName.length > 3) {
      user = allUsers.find(u => {
        const userName = u.name?.toLowerCase() || ''
        return userName.includes(normalizedAssigneeName)
      })
    }
    
    infraCheckAssigneeUser = user ?? null
  }
  
  return {
    ...client,
    assignments: validAssignments, // Only include assignments with valid users
    infraCheckAssigneeUser,
    teamAssignments,
  } as any
}

export default async function ClientPage({ params }: ClientPageProps) {
  const [client, session] = await Promise.all([
    getClient(params.id),
    auth(),
  ])
  
  if (!client) {
    notFound()
  }

  // Only admins and engineers can edit
  const canEdit = session?.user?.role === 'ADMIN' || session?.user?.role === 'IT_ENGINEER'

  return <ClientDetailView client={client} canEdit={canEdit} />
}

