import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { withCache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/me/team-clients
 *
 * Get clients for the current user's team based on their manager role:
 * - SE Manager: All clients with System Engineers assigned
 * - GRC Manager: All clients with GRC Engineers assigned
 * - IT Manager: Clients for consultants in their team
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current user's jobTitle and team
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      jobTitle: true,
      team: true,
    },
  })

  if (!currentUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { jobTitle, team } = currentUser

  // Generate cache key for this user's team clients
  const cacheKey = CACHE_KEYS.teamClients(session.user.id)

  // Use cache wrapper - fetches from cache or database
  const result = await withCache(
    cacheKey,
    async () => {
      // Determine manager type and fetch appropriate clients
      let clients: any[] = []
      let managerType: string | null = null
      let teamMembers: any[] = []

      if (jobTitle === 'SE Manager') {
    managerType = 'SE Manager'
    teamMembers = await db.user.findMany({
      where: {
        OR: [
          { jobTitle: 'Systems Engineer' },
          { jobTitle: { contains: 'System Engineer' } },
        ],
      },
      select: { id: true, name: true, image: true },
    })
    clients = await db.client.findMany({
      where: { assignments: { some: { role: 'SE' } } },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        status: true,
        assignments: {
          where: { role: 'SE' },
          select: { user: { select: { id: true, name: true, image: true } } },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    })
    // Map assignments to match old format for backward compatibility
    clients = clients.map(c => ({
      ...c,
      systemEngineer: c.assignments[0]?.user || null,
    }))
  } else if (jobTitle === 'GRC Manager') {
    managerType = 'GRC Manager'
    teamMembers = await db.user.findMany({
      where: {
        OR: [
          { jobTitle: 'GRC Engineer' },
          { jobTitle: { contains: 'GRC' } },
        ],
        NOT: { jobTitle: 'GRC Manager' },
      },
      select: { id: true, name: true, image: true },
    })
    clients = await db.client.findMany({
      where: { assignments: { some: { role: 'GRCE' } } },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        status: true,
        assignments: {
          where: { role: 'GRCE' },
          select: { user: { select: { id: true, name: true, image: true } } },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    })
    // Map assignments to match old format for backward compatibility
    clients = clients.map(c => ({
      ...c,
      grceEngineer: c.assignments[0]?.user || null,
    }))
  } else if (jobTitle === 'IT Manager' && team) {
    managerType = 'IT Manager'
    const primaryTeam = team.split(',')[0].trim()
    teamMembers = await db.user.findMany({
      where: {
        team: { contains: primaryTeam },
        jobTitle: { in: ['IT Consultant', 'IT Consultant II'] },
      },
      select: { id: true, name: true, image: true },
    })
    const teamMemberIds = teamMembers.map((m) => m.id)
    clients = await db.client.findMany({
      where: {
        assignments: {
          some: {
            userId: { in: teamMemberIds },
            role: { in: ['PRIMARY', 'SECONDARY'] },
          },
        },
      },
      select: {
        id: true,
        name: true,
        websiteUrl: true,
        status: true,
        primaryEngineer: { select: { id: true, name: true, image: true } },
        secondaryEngineer: { select: { id: true, name: true, image: true } },
      },
      orderBy: { name: 'asc' },
    })
      }

      return {
        managerType,
        team: team?.split(',')[0].trim() || null,
        teamMemberCount: teamMembers.length,
        teamMembers: teamMembers.slice(0, 10),
        clientCount: clients.length,
        clients: clients.slice(0, 20),
      }
    },
    CACHE_TTL.team
  )

  return NextResponse.json(result)
}

