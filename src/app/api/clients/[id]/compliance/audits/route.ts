import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// GET /api/clients/[id]/compliance/audits - Get all audit periods for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const identifier = getIdentifier(session.user.id, request)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.RELAXED)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const audits = await db.complianceAudit.findMany({
      where: { clientId: params.id },
      include: {
        CreatedBy: {
          select: { id: true, name: true, email: true },
        },
        UpdatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { nextAuditDue: 'asc' },
    })

    return NextResponse.json(audits)
  } catch (error: any) {
    console.error('Error fetching audits:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/compliance/audits - Create new audit period
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const {
      framework,
      auditType,
      lastAuditDate,
      auditPeriod,
      nextAuditDue,
      auditor,
      evidenceUrl,
      notes,
    } = body

    if (!framework || !auditType || !lastAuditDate || !auditPeriod || !nextAuditDue) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify client exists
    const client = await db.client.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const audit = await db.complianceAudit.create({
      data: {
        id: crypto.randomUUID(),
        clientId: params.id,
        framework,
        auditType,
        lastAuditDate: new Date(lastAuditDate),
        auditPeriod: parseInt(auditPeriod),
        nextAuditDue: new Date(nextAuditDue),
        auditor: auditor || null,
        evidenceUrl: evidenceUrl || null,
        notes: notes || null,
        status: 'SCHEDULED',
        createdById: session.user.id,
        updatedById: session.user.id,
      },
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
    console.error('Error creating audit:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

