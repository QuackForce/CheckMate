import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

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
  const priority = searchParams.get('priority');
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
  
  if (priority && priority !== 'all') {
    where.priority = priority;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { pocEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Filter: my clients
  if (assignee === 'me' && session?.user?.id) {
    where.OR = [
      ...(where.OR || []),
      { primaryEngineerId: session.user.id },
      { secondaryEngineerId: session.user.id },
      { systemEngineerId: session.user.id },
      { grceEngineerId: session.user.id },
      { itManagerId: session.user.id },
    ]
  }

  // Filter: manager team views
  if (managerTeam) {
    if (managerTeam === 'se') {
      where.OR = [
        ...(where.OR || []),
        { systemEngineerId: { not: null } },
      ]
    } else if (managerTeam === 'grc') {
      where.OR = [
        ...(where.OR || []),
        { grceEngineerId: { not: null } },
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
  
  try {
    // Get total count
    const total = await db.client.count({ where });
    
    // Get clients
    const clients = await db.client.findMany({
      where,
      include: {
        primaryEngineer: {
          select: { id: true, name: true, email: true, image: true },
        },
        secondaryEngineer: {
          select: { id: true, name: true, email: true, image: true },
        },
        clientSystems: {
          where: { isActive: true },
          include: {
            system: {
              select: { id: true, name: true, category: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    // Fetch all users once (instead of querying for each client - N+1 problem fix)
    const allUsers = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })
    
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
    
    // Look up infraCheckAssigneeUser for each client (now using in-memory lookup)
    const clientsWithAssignee = clients.map((client) => {
      let infraCheckAssigneeUser = null
      const assigneeName = (client.infraCheckAssigneeName || client.systemEngineerName)?.trim()
      
      if (assigneeName) {
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
      }
    })
    
    return NextResponse.json({
      clients: clientsWithAssignee,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
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
        infraCheckAssigneeName: infraCheckAssigneeName?.trim() || null,
        // Explicitly set notionPageId to null to indicate this is app-created
        notionPageId: null,
        notionLastSynced: null,
      },
    })

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

