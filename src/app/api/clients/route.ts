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
    
    // Look up infraCheckAssigneeUser for each client
    const clientsWithAssignee = await Promise.all(
      clients.map(async (client) => {
        let infraCheckAssigneeUser = null
        const assigneeName = client.infraCheckAssigneeName || client.systemEngineerName
        
        if (assigneeName) {
          // First try exact match (case-insensitive)
          let user = await db.user.findFirst({
            where: {
              name: { equals: assigneeName.trim(), mode: 'insensitive' },
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          })
          
          // If no exact match, try contains but only if the assignee name is a substring
          // This prevents matching "Daniel" when looking for "Daniel Perez"
          if (!user && assigneeName.trim().length > 3) {
            // Only use contains if the name is long enough to avoid false matches
            const allUsers = await db.user.findMany({
              where: {
                name: { contains: assigneeName.trim(), mode: 'insensitive' },
              },
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            })
            
            // Find the best match - prefer names that start with the assignee name
            user = allUsers.find(u => 
              u.name?.toLowerCase().startsWith(assigneeName.trim().toLowerCase())
            ) || allUsers[0] || null
          }
          
          infraCheckAssigneeUser = user
          
          // Debug logging in development
          if (process.env.NODE_ENV === 'development' && user && user.name !== assigneeName.trim()) {
            console.log(`[Client ${client.id}] Assignee lookup: "${assigneeName}" matched user "${user.name}" (${user.id})`)
          }
        }
        
        return {
          ...client,
          infraCheckAssigneeUser,
        }
      })
    )
    
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

