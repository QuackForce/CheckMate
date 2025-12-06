import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-utils'

// GET /api/integrations - Get all integration settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    
    const integrations = await db.integrationSettings.findMany({
      orderBy: { provider: 'asc' },
    })
    
    // Don't return sensitive data in the list view
    const safeIntegrations = integrations.map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      enabled: integration.enabled,
      hasApiKey: !!integration.apiKey,
      hasApiSecret: !!integration.apiSecret,
      hasAccessToken: !!integration.accessToken,
      connectedAt: integration.connectedAt,
      lastTestedAt: integration.lastTestedAt,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
    }))
    
    return NextResponse.json(safeIntegrations)
  } catch (error: any) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error fetching integrations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

// POST /api/integrations - Create or update integration settings
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    const body = await request.json()
    const { provider, enabled, apiKey, apiSecret, accessToken, refreshToken, config } = body
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider is required' },
        { status: 400 }
      )
    }
    
    const integration = await db.integrationSettings.upsert({
      where: { provider },
      update: {
        enabled: enabled ?? undefined,
        apiKey: apiKey !== undefined ? apiKey : undefined,
        apiSecret: apiSecret !== undefined ? apiSecret : undefined,
        accessToken: accessToken !== undefined ? accessToken : undefined,
        refreshToken: refreshToken !== undefined ? refreshToken : undefined,
        config: config !== undefined ? config : undefined,
        connectedAt: (enabled && apiKey) ? new Date() : undefined,
      },
      create: {
        provider,
        enabled: enabled ?? false,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
        config: config || null,
        connectedAt: (enabled && apiKey) ? new Date() : null,
      },
    })
    
    // Return safe version (without sensitive data)
    const { apiKey: _, apiSecret: __, accessToken: ___, refreshToken: ____, ...safeIntegration } = integration
    
    return NextResponse.json(safeIntegration)
  } catch (error: any) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Error saving integration:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save integration' },
      { status: 500 }
    )
  }
}


