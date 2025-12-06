import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Query parameters
  const status = searchParams.get('status');
  const team = searchParams.get('team');
  const priority = searchParams.get('priority');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
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

