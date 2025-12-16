import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';
import { withCache, CACHE_KEYS, CACHE_TTL, generateCacheKey, invalidateClientCache } from '@/lib/cache';

// Use string literals for roles (Prisma enum may not be exported)
const ClientEngineerRole = {
  SE: 'SE',
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
  GRCE: 'GRCE',
  IT_MANAGER: 'IT_MANAGER',
} as const

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Rate limiting for GET (relaxed - page loads)
  const session = await auth()
  const identifier = getIdentifier(session?.user?.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.RELAXED)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }
  const searchParams = request.nextUrl.searchParams;
  
  // Query parameters
  const status = searchParams.get('status');
  const team = searchParams.get('team');
  const teamId = searchParams.get('teamId');
  const priority = searchParams.get('priority');
  const cadence = searchParams.get('cadence');
  const infraCheckAssignee = searchParams.get('infraCheckAssignee');
  const sort = searchParams.get('sort');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const assignee = searchParams.get('assignee')
  const managerTeam = searchParams.get('managerTeam')
  
  // Build where clause
  const where: any = {};
  
  if (status && status !== 'all') {
    where.status = status;
  }
  
  if (team && team !== 'all') {
    where.teams = { has: team };
  }
  
  // Filter by team ID (new team system)
  if (teamId && teamId !== 'all') {
    where.teamAssignments = {
      some: {
        teamId: teamId,
      },
    };
  }
  
  if (priority && priority !== 'all') {
    if (priority === 'none') {
      where.priority = null;
    } else {
      where.priority = priority;
    }
  }
  
  if (cadence && cadence !== 'all') {
    where.cadence = cadence;
  }
  
  // Filter by infra check assignee
  if (infraCheckAssignee && infraCheckAssignee !== 'all') {
    // Get client IDs where this user is assigned as infra check assignee
    const clientsWithAssignee = await db.infraCheck.findMany({
      where: {
        assignedEngineerId: infraCheckAssignee,
      },
      select: {
        clientId: true,
      },
      distinct: ['clientId'],
    });
    const clientIds = clientsWithAssignee.map(c => c.clientId);
    
    if (clientIds.length > 0) {
      where.id = { in: clientIds };
    } else {
      // No clients found, return empty result
      where.id = { in: [] };
    }
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { pocEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter: my clients
  if (assignee === 'me' && session?.user?.id) {
    // Get client IDs where user has infra checks assigned
    const clientsWithMyChecks = await db.infraCheck.findMany({
      where: {
        assignedEngineerId: session.user.id,
      },
      select: {
        clientId: true,
      },
      distinct: ['clientId'],
    })
    const clientIdsWithMyChecks = clientsWithMyChecks.map(c => c.clientId)

    where.OR = [
      ...(where.OR || []),
      // Use assignment table (all roles including SE, PRIMARY, SECONDARY, GRCE, IT_MANAGER)
      { assignments: { some: { userId: session.user.id } } },
      // Also include clients where user has infra checks assigned
      ...(clientIdsWithMyChecks.length > 0 ? [{ id: { in: clientIdsWithMyChecks } }] : []),
    ]
  }

  // Filter: manager team views
  if (managerTeam) {
    if (managerTeam === 'se') {
      where.OR = [
        ...(where.OR || []),
        { assignments: { some: { role: 'SE' } } },
      ]
    } else if (managerTeam === 'grc') {
      where.OR = [
        ...(where.OR || []),
        { assignments: { some: { role: 'GRCE' } } },
      ]
    } else if (managerTeam.startsWith('consultant-team-')) {
      const teamNum = managerTeam.replace('consultant-team-', '')
      const teamName = `Consultant Team ${teamNum}`
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { teams: { has: teamName } },
            { teams: { hasSome: [`Team ${teamNum}`, teamName] } },
          ],
        },
      ]
    }
  }
  
  // Generate cache key from query parameters
  const cacheKey = CACHE_KEYS.clients(
    generateCacheKey('list', {
      status: status || 'all',
      team: team || 'all',
      teamId: teamId || 'all',
      priority: priority || 'all',
      cadence: cadence || 'all',
      infraCheckAssignee: infraCheckAssignee || 'all',
      sort: sort || 'default',
      search: search || '',
      page: page.toString(),
      limit: limit.toString(),
      assignee: assignee || '',
      managerTeam: managerTeam || '',
      userId: session?.user?.id || '',
    })
  )
  
  try {
    // Use cache wrapper - fetches from cache or database
    const result = await withCache(
      cacheKey,
      async () => {
        // Get total count
        const total = await db.client.count({ where });
        
        // Get clients
        const clients = await db.client.findMany({
          where,
          include: {
            User_Client_primaryEngineerIdToUser: {
              select: { id: true, name: true, email: true, image: true },
            },
            User_Client_secondaryEngineerIdToUser: {
              select: { id: true, name: true, email: true, image: true },
            },
            ClientSystem: {
              where: { isActive: true },
              include: {
                System: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
          orderBy: sort === 'za' 
            ? { name: 'desc' }
            : sort === 'az'
            ? { name: 'asc' }
            : { name: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        });
        
        // Fetch assignments for all clients in one query (to avoid N+1)
        const allClientIds = clients.map(c => c.id)
        const allAssignments = allClientIds.length > 0
          ? await (db as any).clientEngineerAssignment.findMany({
              where: { clientId: { in: allClientIds } },
              select: {
                clientId: true,
                role: true,
                User: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            })
          : []
        
        // Only fetch users that are actually assigned to the clients being displayed
        // This dramatically reduces egress (from all users to only assigned users)
        const assignedUserIds = new Set<string>()
        
        // Collect user IDs from assignments
        allAssignments.forEach((a: any) => {
          if (a.User?.id) assignedUserIds.add(a.User.id)
        })
        
        // Collect user IDs from legacy client fields (already included in clients query)
        clients.forEach((c: any) => {
          if (c.primaryEngineerId) assignedUserIds.add(c.primaryEngineerId)
          if (c.secondaryEngineerId) assignedUserIds.add(c.secondaryEngineerId)
          if (c.systemEngineerId) assignedUserIds.add(c.systemEngineerId)
          if (c.grceEngineerId) assignedUserIds.add(c.grceEngineerId)
          if (c.itManagerId) assignedUserIds.add(c.itManagerId)
        })
        
        // Only fetch users that are actually needed (instead of ALL users)
        // This reduces egress by 80-90% (from 50 users to ~5-10 assigned users)
        const allUsers = assignedUserIds.size > 0
          ? await db.user.findMany({
              where: { id: { in: Array.from(assignedUserIds) } },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            })
          : []
        
        // Create a lookup map for fast in-memory matching
        const userMap = new Map<string, typeof allUsers[0]>()
        allUsers.forEach(user => {
          if (user.name) {
            const normalizedName = user.name.toLowerCase().trim()
            // Store both exact and lowercase versions for fast lookup
            userMap.set(normalizedName, user)
            // Also store by first word for partial matches
            const firstName = normalizedName.split(' ')[0]
            if (firstName && firstName.length > 2) {
              if (!userMap.has(firstName)) {
                userMap.set(firstName, user)
              }
            }
          }
        })
        
        // Fetch team assignments for all clients in one query (to avoid N+1)
        let allTeamAssignments: any[] = []
        try {
          allTeamAssignments = allClientIds.length > 0
            ? await (db as any).clientTeam.findMany({
                where: { clientId: { in: allClientIds } },
                select: {
                  id: true,
                  clientId: true,
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
            : []
        } catch (teamError: any) {
          // If ClientTeam table doesn't exist or there's an error, just return empty array
          console.warn('Error fetching team assignments (may not exist yet):', teamError.message)
          allTeamAssignments = []
        }
        
        // Group assignments by clientId
        const assignmentsByClient = new Map<string, typeof allAssignments>()
        allAssignments.forEach((a: any) => {
          if (!assignmentsByClient.has(a.clientId)) {
            assignmentsByClient.set(a.clientId, [])
          }
          assignmentsByClient.get(a.clientId)!.push(a)
        })
        
        // Group team assignments by clientId
        const teamAssignmentsByClient = new Map<string, typeof allTeamAssignments>()
        allTeamAssignments.forEach((ta: any) => {
          if (!teamAssignmentsByClient.has(ta.clientId)) {
            teamAssignmentsByClient.set(ta.clientId, [])
          }
          teamAssignmentsByClient.get(ta.clientId)!.push(ta)
        })
        
        // Look up infraCheckAssigneeUser for each client (now using in-memory lookup)
        const clientsWithAssignee = clients.map((client) => {
          let infraCheckAssigneeUser = null
          const clientAssignments = assignmentsByClient.get(client.id) || []
          const seAssignments = clientAssignments.filter((a: any) => a.role === 'SE')
          const seFromAssignments = seAssignments.length > 0 ? seAssignments[0].User : null
          const assigneeName = (client.infraCheckAssigneeName || seFromAssignments?.name || client.systemEngineerName)?.trim()
          
          // If we have SE from assignments, use that user directly
          if (seFromAssignments && !client.infraCheckAssigneeName) {
            infraCheckAssigneeUser = seFromAssignments
          } else if (assigneeName) {
            const normalizedAssigneeName = assigneeName.toLowerCase()
            
            // First try exact match
            let user = userMap.get(normalizedAssigneeName)
            
            // If no exact match, try first word match
            if (!user) {
              const firstName = normalizedAssigneeName.split(' ')[0]
              if (firstName && firstName.length > 2) {
                user = userMap.get(firstName)
              }
            }
            
            // If still no match, try contains search (but only if name is long enough)
            if (!user && assigneeName.length > 3) {
              user = allUsers.find(u => {
                const userName = u.name?.toLowerCase() || ''
                return userName.includes(normalizedAssigneeName) || 
                       userName.startsWith(normalizedAssigneeName)
              })
            }
            
            infraCheckAssigneeUser = user ?? null
          }
          
          return {
            ...client,
            infraCheckAssigneeUser,
            assignments: clientAssignments,
            teamAssignments: teamAssignmentsByClient.get(client.id) || [],
          }
        })
        
        return {
          clients: clientsWithAssignee,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      },
      CACHE_TTL.clients
    );
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Only admins and IT engineers can create clients
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'IT_ENGINEER')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Rate limiting for POST (general - creating clients)
    const identifier = getIdentifier(session.user.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before creating more clients.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const body = await request.json()
    const { 
      name, 
      status = 'ACTIVE', 
      priority, 
      defaultCadence = 'MONTHLY',
      websiteUrl,
      pocEmail,
      officeAddress,
      notes,
      infraCheckAssigneeName,
      assignments,
      teamIds, // Array of team IDs
    } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    // Validate assignment limits if provided
    if (assignments) {
      const MAX_ASSIGNMENTS_PER_ROLE = 4
      if (assignments.SE && assignments.SE.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} System Engineers allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.PRIMARY && assignments.PRIMARY.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} Primary Consultants allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.SECONDARY && assignments.SECONDARY.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} Secondary Consultants allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.GRCE && assignments.GRCE.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} GRCE Engineers allowed per client` },
          { status: 400 }
        )
      }
      if (assignments.IT_MANAGER && assignments.IT_MANAGER.length > MAX_ASSIGNMENTS_PER_ROLE) {
        return NextResponse.json(
          { error: `Maximum ${MAX_ASSIGNMENTS_PER_ROLE} IT Managers allowed per client` },
          { status: 400 }
        )
      }
    }

    // Determine infra check assignee: use provided override, or default to first SE
    let finalInfraCheckAssigneeName = infraCheckAssigneeName?.trim() || null
    if (!finalInfraCheckAssigneeName && assignments?.SE && assignments.SE.length > 0) {
      // Get the name of the first SE
      const firstSeUser = await db.user.findUnique({
        where: { id: assignments.SE[0] },
        select: { name: true },
      })
      if (firstSeUser?.name) {
        finalInfraCheckAssigneeName = firstSeUser.name
      }
    }

    // Prepare name fields from assignments for backward compatibility
    let systemEngineerName: string | null = null
    let primaryConsultantName: string | null = null
    let secondaryConsultantNames: string[] = []
    let grceEngineerName: string | null = null
    let itManagerName: string | null = null

    if (assignments) {
      // Fetch user names for assignments
      const allAssignedUserIds = [
        ...(assignments.SE || []),
        ...(assignments.PRIMARY || []),
        ...(assignments.SECONDARY || []),
        ...(assignments.GRCE || []),
        ...(assignments.IT_MANAGER || []),
      ]
      
      if (allAssignedUserIds.length > 0) {
        const assignedUsers = await db.user.findMany({
          where: { id: { in: allAssignedUserIds } },
          select: { id: true, name: true },
        })

        const getUserName = (userId: string) => assignedUsers.find(u => u.id === userId)?.name || null

        // Set name fields (first name for each role)
        if (assignments.SE && assignments.SE.length > 0) {
          systemEngineerName = getUserName(assignments.SE[0])
        }
        if (assignments.PRIMARY && assignments.PRIMARY.length > 0) {
          primaryConsultantName = getUserName(assignments.PRIMARY[0])
        }
        if (assignments.SECONDARY && assignments.SECONDARY.length > 0) {
          secondaryConsultantNames = assignments.SECONDARY
            .map(getUserName)
            .filter((name: string | null): name is string => name !== null)
        }
        if (assignments.GRCE && assignments.GRCE.length > 0) {
          grceEngineerName = getUserName(assignments.GRCE[0])
        }
        if (assignments.IT_MANAGER && assignments.IT_MANAGER.length > 0) {
          itManagerName = getUserName(assignments.IT_MANAGER[0])
        }
      }
    }

    // Create client in database (notionPageId will be null - app-created)
    const client = await db.client.create({
      data: {
        name: name.trim(),
        status,
        priority: priority || null,
        defaultCadence,
        websiteUrl: websiteUrl?.trim() || null,
        pocEmail: pocEmail?.trim() || null,
        officeAddress: officeAddress?.trim() || null,
        notes: notes?.trim() || null,
        infraCheckAssigneeName: finalInfraCheckAssigneeName,
        // Legacy name fields for backward compatibility
        systemEngineerName,
        primaryConsultantName,
        secondaryConsultantNames,
        grceEngineerName,
        itManagerName,
        // Explicitly set notionPageId to null to indicate this is app-created
        notionPageId: null,
        notionLastSynced: null,
      },
    })

    // Create ClientEngineerAssignment records if assignments provided
    if (assignments) {
      const assignmentsToCreate: Array<{
        clientId: string
        userId: string
        role: string
      }> = []

      if (assignments.SE) {
        assignments.SE.forEach((userId: string) => {
          assignmentsToCreate.push({
            clientId: client.id,
            userId,
            role: ClientEngineerRole.SE as string,
          })
        })
      }

      if (assignments.PRIMARY) {
        assignments.PRIMARY.forEach((userId: string) => {
          assignmentsToCreate.push({
            clientId: client.id,
            userId,
            role: ClientEngineerRole.PRIMARY as string,
          })
        })
      }

      if (assignments.SECONDARY) {
        assignments.SECONDARY.forEach((userId: string) => {
          assignmentsToCreate.push({
            clientId: client.id,
            userId,
            role: ClientEngineerRole.SECONDARY as string,
          })
        })
      }

      if (assignments.GRCE) {
        assignments.GRCE.forEach((userId: string) => {
          assignmentsToCreate.push({
            clientId: client.id,
            userId,
            role: ClientEngineerRole.GRCE as string,
          })
        })
      }

      if (assignments.IT_MANAGER) {
        assignments.IT_MANAGER.forEach((userId: string) => {
          assignmentsToCreate.push({
            clientId: client.id,
            userId,
            role: ClientEngineerRole.IT_MANAGER as string,
          })
        })
      }

      // Create all assignments
      if (assignmentsToCreate.length > 0) {
        await (db as any).clientEngineerAssignment.createMany({
          data: assignmentsToCreate,
          skipDuplicates: true,
        })
      }
    }

    // Create ClientTeam records if teamIds provided
    if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
      // Validate that all team IDs exist
      const existingTeams = await db.team.findMany({
        where: { 
          id: { in: teamIds },
          isActive: true,
        },
        select: { id: true },
      })

      const validTeamIds = existingTeams.map(t => t.id)
      
      if (validTeamIds.length > 0) {
        const clientTeamsToCreate = validTeamIds.map(teamId => ({
          clientId: client.id,
          teamId,
        }))

        await (db as any).clientTeam.createMany({
          data: clientTeamsToCreate,
          skipDuplicates: true,
        })
      }
    }

    // If websiteUrl is provided, look up trust center
    if (websiteUrl) {
      try {
        const { lookupTrustCenter } = await import('@/lib/trustlists')
        const trustCenter = await lookupTrustCenter(websiteUrl)
        if (trustCenter.found) {
          await db.client.update({
            where: { id: client.id },
            data: {
              trustCenterUrl: trustCenter.trustCenterUrl,
              trustCenterPlatform: trustCenter.platform,
            },
          })
        }
      } catch (error) {
        // Silently fail trust center lookup - don't block client creation
        console.error('Failed to lookup trust center:', error)
      }
    }

    // Invalidate client cache when a new client is created
    await invalidateClientCache()

    return NextResponse.json({
      success: true,
      client,
    })
  } catch (error: any) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create client' },
      { status: 500 }
    )
  }
}

