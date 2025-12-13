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

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
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
      }
    })

    return NextResponse.json(users)
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



