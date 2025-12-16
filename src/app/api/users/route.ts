import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/users - Get all users (admin only)
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Non-admins can fetch users but only for assignment purposes (limited fields)
    const isAdmin = session.user.role === 'ADMIN'

    // Rate limiting
    const identifier = getIdentifier(session.user.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limitParam = searchParams.get('limit')
    // Default to 30 per page, but allow higher limits for dropdowns (e.g., limit=200)
    // If limit is 'all' or very high, fetch all users (for backward compatibility with dropdowns)
    const limit = limitParam === 'all' || (limitParam && parseInt(limitParam) > 1000) 
      ? undefined 
      : parseInt(limitParam || '30')
    const search = searchParams.get('search')
    const role = searchParams.get('role')

    // Admin gets full user data, non-admins get minimal data for assignments only
    const selectFields = isAdmin ? {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      notionTeamMemberId: true,
      notionTeamMemberName: true,
      createdAt: true,
      _count: {
        select: {
          assignedChecks: true,
          completedChecks: true,
        }
      }
    } : {
      // Non-admins only get fields needed for assignment dropdowns
      id: true,
      name: true,
      email: true,
      image: true,
    }

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role && role !== 'all') {
      where.role = role
    }

    // Get total count for pagination
    const total = await db.user.count({ where })

    // Fetch users with pagination
    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: selectFields,
      ...(limit !== undefined && {
        skip: (page - 1) * limit,
        take: limit,
      }),
    })

    // Return paginated response if limit is set, otherwise return all users (for backward compatibility)
    if (limit !== undefined) {
      return NextResponse.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    } else {
      // Return all users (for backward compatibility with dropdowns that expect array)
      return NextResponse.json(users)
    }
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/users - Create a new user (admin only) or sync from Notion
// Force dynamic rendering for this route

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Rate limiting
    const identifier = getIdentifier(session.user.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const body = await request.json()
    const { email, name, role, jobTitle, managerId, notionTeamMemberId, notionTeamMemberName } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        role: role || 'VIEWER',
        jobTitle: jobTitle || null,
        managerId: managerId || null,
        // Notion fields are optional - only include if provided
        ...(notionTeamMemberId && { notionTeamMemberId }),
        ...(notionTeamMemberName && { notionTeamMemberName }),
      }
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



