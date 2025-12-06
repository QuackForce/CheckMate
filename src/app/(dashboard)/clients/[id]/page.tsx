import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { ClientDetailView } from '@/components/clients/client-detail-view'

interface ClientPageProps {
  params: { id: string }
}

async function getClient(id: string) {
  const client = await db.client.findUnique({
    where: { id },
    include: {
      primaryEngineer: true,
      secondaryEngineer: true,
      checks: {
        take: 5,
        orderBy: { scheduledDate: 'desc' },
      },
    },
  })
  
  if (!client) return null
  
  // Look up the infra check assignee user by name if set
  let infraCheckAssigneeUser = null
  if (client.infraCheckAssigneeName) {
    // First try exact match (case-insensitive)
    let user = await db.user.findFirst({
      where: {
        name: { equals: client.infraCheckAssigneeName.trim(), mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })
    
    // If no exact match, try contains but only if the name is long enough
    if (!user && client.infraCheckAssigneeName.trim().length > 3) {
      const allUsers = await db.user.findMany({
        where: {
          name: { contains: client.infraCheckAssigneeName.trim(), mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })
      
      // Find the best match - prefer names that start with the assignee name
      const trimmedName = client.infraCheckAssigneeName.trim()
      user = allUsers.find(u => 
        u.name?.toLowerCase().startsWith(trimmedName.toLowerCase())
      ) || allUsers[0] || null
    }
    
    infraCheckAssigneeUser = user
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && user && user.name !== client.infraCheckAssigneeName.trim()) {
      console.log(`[Client ${client.id}] Assignee lookup: "${client.infraCheckAssigneeName}" matched user "${user.name}" (${user.id})`)
    }
  } else if (client.systemEngineerName) {
    // Fallback to system engineer if no override
    // First try exact match (case-insensitive)
    let user = await db.user.findFirst({
      where: {
        name: { equals: client.systemEngineerName.trim(), mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })
    
    // If no exact match, try contains but only if the name is long enough
    if (!user && client.systemEngineerName.trim().length > 3) {
      const allUsers = await db.user.findMany({
        where: {
          name: { contains: client.systemEngineerName.trim(), mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })
      
      // Find the best match - prefer names that start with the system engineer name
      const trimmedSeName = client.systemEngineerName.trim()
      user = allUsers.find(u => 
        u.name?.toLowerCase().startsWith(trimmedSeName.toLowerCase())
      ) || allUsers[0] || null
    }
    
    infraCheckAssigneeUser = user
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

