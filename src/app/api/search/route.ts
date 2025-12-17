import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

/**
 * GET /api/search
 * Global search across clients, checks, team members, systems, and frameworks
 * Only searches active/non-archived items
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ 
      clients: [],
      checks: [],
      team: [],
      systems: [],
      frameworks: [],
    })
  }

  const searchTerm = query.toLowerCase()
  const userRole = session.user.role || 'CONSULTANT'

  try {
    // Search clients (only ACTIVE)
    const clients = await db.client.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { pocEmail: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
      },
      take: 5,
    })

    // Search checks (only SCHEDULED, IN_PROGRESS, or COMPLETED - not CANCELLED)
    const checks = await db.infraCheck.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] },
        OR: [
          {
            Client: {
              name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
          {
            User_InfraCheck_assignedEngineerIdToUser: {
              OR: [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
              ],
            },
          },
          {
            assignedEngineerName: { contains: searchTerm, mode: 'insensitive' },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        Client: {
          select: {
            id: true,
            name: true,
          },
        },
        User_InfraCheck_assignedEngineerIdToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedEngineerName: true,
      },
      take: 5,
      orderBy: {
        scheduledDate: 'desc',
      },
    })

    // Search team members - basic profile info available to everyone
    // Full team management features still require team:view permission
    const team = await db.user.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { slackUsername: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        jobTitle: true,
        team: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 5,
    })

    // Search systems (only active)
    const canViewSystems = hasPermission(userRole, 'settings:view')
    let systems: any[] = []
    if (canViewSystems) {
      // Search by name only (category is an enum, can't use contains)
      systems = await db.system.findMany({
        where: {
          isActive: true,
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          category: true,
        },
        take: 5,
      })
    }

    // Search frameworks
    let frameworks: any[] = []
    if (canViewSystems) {
      frameworks = await db.framework.findMany({
        where: {
          name: { contains: searchTerm, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          description: true,
        },
        take: 5,
      })
    }

    return NextResponse.json({
      clients: clients.map(c => ({
        id: c.id,
        name: c.name,
        type: 'client',
        url: `/clients/${c.id}`,
      })),
      checks: checks.map(c => ({
        id: c.id,
        name: `${c.Client.name} - ${c.status}`,
        type: 'check',
        url: `/checks/${c.id}`,
        clientName: c.Client.name,
        status: c.status,
      })),
      team: team.map(u => ({
        id: u.id,
        name: u.name || u.email,
        type: 'team',
        url: `/team`,
        email: u.email,
        image: u.image,
        jobTitle: u.jobTitle,
        team: u.team,
        manager: u.User ? {
          id: u.User.id,
          name: u.User.name,
          email: u.User.email,
        } : null,
      })),
      systems: systems.map(s => ({
        id: s.id,
        name: s.name,
        type: 'system',
        url: `/settings/systems`,
        category: s.category,
      })),
      frameworks: frameworks.map(f => ({
        id: f.id,
        name: f.name,
        type: 'framework',
        url: `/settings/frameworks`,
      })),
    })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    )
  }
}
