import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'
import { invalidateRoleConfigCache } from '@/lib/role-config'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Admin only
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
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

    // Update role
    const role = await db.roleConfiguration.update({
      where: { id: params.id },
      data: {
        ...(label !== undefined && { label }),
        ...(abbreviation !== undefined && { abbreviation }),
        ...(bgColor !== undefined && { bgColor }),
        ...(textColor !== undefined && { textColor }),
        ...(borderColor !== undefined && { borderColor }),
        ...(priority !== undefined && { priority }),
        ...(allowMultiple !== undefined && { allowMultiple }),
        ...(maxAssignments !== undefined && { maxAssignments }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
    })

    // Invalidate cache
    invalidateRoleConfigCache()

    return NextResponse.json(role)
  } catch (error: any) {
    console.error('Error updating role:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Admin only
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    // Check if role is being used
    const role = await db.roleConfiguration.findUnique({
      where: { id: params.id },
      select: { roleKey: true },
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Check if any assignments use this role
    const assignmentCount = await db.clientEngineerAssignment.count({
      where: { role: role.roleKey as any },
    })

    if (assignmentCount > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete role: ${assignmentCount} client assignment(s) are using this role. Please remove all assignments first.`,
          assignmentCount,
        },
        { status: 400 }
      )
    }

    // Delete role
    await db.roleConfiguration.delete({
      where: { id: params.id },
    })

    // Invalidate cache
    invalidateRoleConfigCache()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting role:', error)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete role' },
      { status: 500 }
    )
  }
}

