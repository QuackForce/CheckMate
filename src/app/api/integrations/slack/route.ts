import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIntegrationConfig } from '@/lib/integrations'

// GET /api/integrations/slack - Get Slack integration status (safe for all users)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get Slack config (this function handles caching and env fallback)
    const config = await getIntegrationConfig('slack')

    // Return safe status without exposing the actual token
    return NextResponse.json({
      connected: !!config.apiKey && config.enabled,
      enabled: config.enabled,
      config: {
        // Don't expose the actual token, just indicate if it exists
        botToken: config.apiKey ? '***configured***' : null,
      },
    })
  } catch (error: any) {
    console.error('Error fetching Slack status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Slack status' },
      { status: 500 }
    )
  }
}

