import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// PATCH /api/clients/[id]/compliance/audits/[auditId] - Update audit period
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; auditId: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions: IT_ENGINEER, IT_MANAGER, or ADMIN
  const userRole = session.user.role
  const canManage = userRole === 'IT_ENGINEER' || userRole === 'IT_MANAGER' || userRole === 'ADMIN'
  
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const identifier = getIdentifier(session.user.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()
    const updateData: any = {
      updatedById: session.user.id,
    }

    // Only update fields that are provided
    if (body.framework !== undefined) updateData.framework = body.framework
    if (body.auditType !== undefined) updateData.auditType = body.auditType
    if (body.lastAuditDate !== undefined) updateData.lastAuditDate = new Date(body.lastAuditDate)
    if (body.auditPeriod !== undefined) updateData.auditPeriod = parseInt(body.auditPeriod)
    if (body.nextAuditDue !== undefined) updateData.nextAuditDue = new Date(body.nextAuditDue)
    if (body.actualDate !== undefined) updateData.actualDate = body.actualDate ? new Date(body.actualDate) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.auditor !== undefined) updateData.auditor = body.auditor
    if (body.evidenceUrl !== undefined) updateData.evidenceUrl = body.evidenceUrl
    if (body.notes !== undefined) updateData.notes = body.notes

    const audit = await db.complianceAudit.update({
      where: { id: params.auditId },
      data: updateData,
      include: {
        CreatedBy: {
          select: { id: true, name: true, email: true },
        },
        UpdatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(audit)
  } catch (error: any) {
    console.error('Error updating audit:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/compliance/audits/[auditId] - Delete audit period
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; auditId: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions: IT_ENGINEER, IT_MANAGER, or ADMIN
  const userRole = session.user.role
  const canManage = userRole === 'IT_ENGINEER' || userRole === 'IT_MANAGER' || userRole === 'ADMIN'
  
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const identifier = getIdentifier(session.user.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    await db.complianceAudit.delete({
      where: { id: params.auditId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting audit:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

