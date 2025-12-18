import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'
import { invalidateRoleConfigCache } from '@/lib/role-config'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // Rate limiting
    const identifier = getIdentifier(session?.user?.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.RELAXED)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Check permissions - Engineer+ only
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    if (userRole !== 'ADMIN' && userRole !== 'IT_ENGINEER' && userRole !== 'CONSULTANT') {
      return NextResponse.json(
        { error: 'Unauthorized - Engineer access required' },
        { status: 403 }
      )
    }

    const roles = await db.roleConfiguration.findMany({
      orderBy: [
        { priority: 'asc' },
        { label: 'asc' },
      ],
    })

    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Rate limiting
    const identifier = getIdentifier(session?.user?.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.STRICT)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please slow down.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }

    // Admin only for creating roles
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      roleKey,
      label,
      abbreviation,
      bgColor,
      textColor,
      borderColor,
      priority,
      allowMultiple,
      maxAssignments,
      isActive,
    } = body

    // Validate required fields
    if (!roleKey || !label || !abbreviation) {
      return NextResponse.json(
        { error: 'roleKey, label, and abbreviation are required' },
        { status: 400 }
      )
    }

    // Validate roleKey format (uppercase, alphanumeric + underscore)
    if (!/^[A-Z0-9_]+$/.test(roleKey)) {
      return NextResponse.json(
        { error: 'roleKey must be uppercase alphanumeric with underscores only (e.g., JR_SYSTEM_ENGINEER)' },
        { status: 400 }
      )
    }

    // Check if role already exists
    const existing = await db.roleConfiguration.findUnique({
      where: { roleKey },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Role with key "${roleKey}" already exists` },
        { status: 409 }
      )
    }

    // Create new role
    const role = await db.roleConfiguration.create({
      data: {
        roleKey: roleKey.toUpperCase(),
        label,
        abbreviation,
        bgColor: bgColor || 'bg-surface-700/20',
        textColor: textColor || 'text-surface-400',
        borderColor: borderColor || 'border-surface-600/30',
        priority: priority ?? 99,
        allowMultiple: allowMultiple ?? true,
        maxAssignments: maxAssignments ?? 0,
        isActive: isActive ?? true,
        updatedAt: new Date(),
      },
    })

    // Invalidate cache
    invalidateRoleConfigCache()

    return NextResponse.json(role, { status: 201 })
  } catch (error: any) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create role' },
      { status: 500 }
    )
  }
}

