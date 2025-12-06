import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ClientDetailView } from '@/components/clients/client-detail-view'

interface ClientPageProps {
  params: { id: string }
}

async function getClient(id: string) {
  const [client, allUsers] = await Promise.all([
    db.client.findUnique({
      where: { id },
      include: {
        primaryEngineer: true,
        secondaryEngineer: true,
        checks: {
          take: 5,
          orderBy: { scheduledDate: 'desc' },
        },
      },
    }),
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
  
  // Look up the infra check assignee user by name if set (using in-memory lookup)
  let infraCheckAssigneeUser = null
  const assigneeName = (client.infraCheckAssigneeName || client.systemEngineerName)?.trim()
  
  if (assigneeName) {
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
      }) || null
    }
    
    infraCheckAssigneeUser = user || null
  }
  
  return {
    ...client,
    infraCheckAssigneeUser,
  }
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

