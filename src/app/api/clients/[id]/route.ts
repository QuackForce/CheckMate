import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer, requireAdmin } from '@/lib/auth-utils'

// GET /api/clients/[id] - Get a single client
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await db.client.findUnique({
      where: { id: params.id },
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
        checks: {
          take: 5,
          orderBy: { scheduledDate: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Error fetching client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/clients/[id] - Update a client (Engineer+ only)
// Force dynamic rendering for this route

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireEngineer()
  if (error) return error

  try {
    const body = await request.json()
    
    // Only allow updating certain fields
    const allowedFields = [
      'name',
      'status',
      'priority',
      'slackChannelId',
      'slackChannelName',
      'defaultCadence',
      'customCadenceDays',
      'checkCadence',
      'pocEmail',
      'officeAddress',
      'hoursPerMonth',
      'itSyncsFrequency',
      'onsitesFrequency',
      'websiteUrl',
      'notes',
      // Engineer names
      'systemEngineerName',
      'primaryConsultantName',
      'secondaryConsultantNames',
      'itManagerName',
      'grceEngineerName',
      // App-specific override
      'infraCheckAssigneeName',
      // Compliance
      'complianceFrameworks',
    ]

    // Filter to only allowed fields
    const updateData: any = {}
    const oldInfraCheckAssigneeName = body._oldInfraCheckAssigneeName // Track old value
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const client = await db.client.update({
      where: { id: params.id },
      data: updateData,
    })
    
    // If infraCheckAssigneeName changed, update all incomplete checks for this client
    if (updateData.infraCheckAssigneeName !== undefined && 
        updateData.infraCheckAssigneeName !== oldInfraCheckAssigneeName) {
      const newAssigneeName = updateData.infraCheckAssigneeName || client.systemEngineerName
      
      // Update all incomplete checks (SCHEDULED, IN_PROGRESS, OVERDUE)
      await db.infraCheck.updateMany({
        where: {
          clientId: params.id,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] },
        },
        data: {
          assignedEngineerName: newAssigneeName,
          // Try to link to User if exists
          assignedEngineerId: null, // Will be set below if user found
        },
      })
      
      // Try to find and link the user
      if (newAssigneeName) {
        const assigneeUser = await db.user.findFirst({
          where: {
            OR: [
              { name: newAssigneeName },
              { name: { contains: newAssigneeName, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        })
        
        if (assigneeUser) {
          // Update checks to link to the user
          await db.infraCheck.updateMany({
            where: {
              clientId: params.id,
              status: { in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] },
            },
            data: {
              assignedEngineerId: assigneeUser.id,
            },
          })
        }
      }
    }

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Error updating client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/clients/[id] - Delete a client (Admin only)
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    await db.client.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting client:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
