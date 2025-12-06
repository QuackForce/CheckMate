import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'

// GET /api/integrations/[provider] - Get specific integration (with sensitive data for editing)
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> | { provider: string } }
) {
  try {
    await requireAdmin()
    
    const resolvedParams = await Promise.resolve(params)
    const provider = resolvedParams.provider
    
    const integration = await db.integrationSettings.findUnique({
      where: { provider },
    })
    
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }
    
    // Return full data (admin only)
    return NextResponse.json(integration)
  } catch (error: any) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching integration:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch integration' },
      { status: 500 }
    )
  }
}

// PATCH /api/integrations/[provider] - Update specific integration
// Force dynamic rendering for this route

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> | { provider: string } }
) {
  try {
    await requireAdmin()
    
    const resolvedParams = await Promise.resolve(params)
    const provider = resolvedParams.provider
    
    const body = await request.json()
    const { enabled, apiKey, apiSecret, accessToken, refreshToken, config, notes } = body
    
    const updateData: any = {}
    if (enabled !== undefined) updateData.enabled = enabled
    if (apiKey !== undefined) updateData.apiKey = apiKey || null
    if (apiSecret !== undefined) updateData.apiSecret = apiSecret || null
    if (accessToken !== undefined) updateData.accessToken = accessToken || null
    if (refreshToken !== undefined) updateData.refreshToken = refreshToken || null
    if (config !== undefined) updateData.config = config || null
    if (notes !== undefined) updateData.notes = notes || null
    
    // Update connectedAt if enabling with API key
    if (enabled && apiKey) {
      updateData.connectedAt = new Date()
    } else if (!enabled || !apiKey) {
      updateData.connectedAt = null
    }
    
    const integration = await db.integrationSettings.upsert({
      where: { provider },
      update: updateData,
      create: {
        provider,
        enabled: enabled ?? false,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        config: config || null,
        notes: notes || null,
        connectedAt: (enabled && apiKey) ? new Date() : null,
      },
    })
    
    // Return safe version
    const { apiKey: _, apiSecret: __, accessToken: ___, refreshToken: ____, ...safeIntegration } = integration
    
    return NextResponse.json(safeIntegration)
  } catch (error: any) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error updating integration:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update integration' },
      { status: 500 }
    )
  }
}

// DELETE /api/integrations/[provider] - Delete integration settings
// Force dynamic rendering for this route

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> | { provider: string } }
) {
  try {
    await requireAdmin()
    
    const resolvedParams = await Promise.resolve(params)
    const provider = resolvedParams.provider
    
    await db.integrationSettings.delete({
      where: { provider },
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error deleting integration:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete integration' },
      { status: 500 }
    )
  }
}

