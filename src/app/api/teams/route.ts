import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeamManager } from '@/lib/auth-utils'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/teams - Get all teams
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      )
    }

    const teamModel = (db as any).team
    if (!teamModel || typeof teamModel.findMany !== 'function') {
      console.error('Team model not available. Available models:', Object.keys(db).filter(k => !k.startsWith('$')))
      return NextResponse.json(
        { error: 'Team model not available. Please restart the dev server.' },
        { status: 500 }
      )
    }

    const teams = await teamModel.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            jobTitle: true,
          },
        },
      },
    })

    return NextResponse.json(teams)
  } catch (error: any) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireTeamManager()
    if (error) return error

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const identifier = getIdentifier(session.user.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before creating more teams.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    const body = await request.json()
    const { name, description, color, tag, managerId } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    // Check if team with same name already exists
    // Access team model - use type assertion to handle Prisma client types
    if (!db) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      )
    }

    const teamModel = (db as any).team
    if (!teamModel || typeof teamModel.findUnique !== 'function') {
      console.error('Team model not available. db.team:', teamModel)
      console.error('Available db properties:', Object.keys(db).filter(k => !k.startsWith('$')))
      return NextResponse.json(
        { error: 'Team model not available. Please restart the dev server (the Prisma client needs to be reloaded).' },
        { status: 500 }
      )
    }

    const existing = await teamModel.findUnique({
      where: { name: name.trim() },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A team with this name already exists' },
        { status: 400 }
      )
    }

    // Create team
    const team = await teamModel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color?.trim() || null,
        tag: tag?.trim() || null,
        managerId: managerId || null,
        isActive: true,
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error: any) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create team' },
      { status: 500 }
    )
  }
}

