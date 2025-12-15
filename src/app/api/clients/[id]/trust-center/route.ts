import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer } from '@/lib/auth-utils'
import { lookupTrustCenter, lookupTrustCenterByName } from '@/lib/trustlists'

// GET /api/clients/[id]/trust-center - Lookup trust center from TrustLists API
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireEngineer()
    if (error) return error

    const client = await db.client.findUnique({
      where: { id: params.id },
      select: {
        name: true,
        websiteUrl: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Try lookup by website URL first
    let trustCenter = null
    if (client.websiteUrl) {
      trustCenter = await lookupTrustCenter(client.websiteUrl)
    }

    // If not found by website, try by company name
    if (!trustCenter?.found && client.name) {
      trustCenter = await lookupTrustCenterByName(client.name)
    }

    if (trustCenter?.found) {
      return NextResponse.json({
        found: true,
        trustCenterUrl: trustCenter.trustCenterUrl,
        platform: trustCenter.platform,
        matchedBy: client.websiteUrl ? 'website' : 'name',
      })
    }

    return NextResponse.json({
      found: false,
      message: 'Trust center not found in TrustLists database',
    })
  } catch (error: any) {
    console.error('Error looking up trust center:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to lookup trust center' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/trust-center - Sync trust center and save to client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireEngineer()
    if (error) return error

    const client = await db.client.findUnique({
      where: { id: params.id },
      select: {
        name: true,
        websiteUrl: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Try lookup by website URL first
    let trustCenter = null
    if (client.websiteUrl) {
      trustCenter = await lookupTrustCenter(client.websiteUrl)
    }

    // If not found by website, try by company name
    if (!trustCenter?.found && client.name) {
      trustCenter = await lookupTrustCenterByName(client.name)
    }

    if (!trustCenter?.found) {
      return NextResponse.json(
        { error: 'Trust center not found in TrustLists database' },
        { status: 404 }
      )
    }

    // Update client with trust center data
    const updated = await db.client.update({
      where: { id: params.id },
      data: {
        trustCenterUrl: trustCenter.trustCenterUrl,
        trustCenterPlatform: trustCenter.platform,
      },
    })

    return NextResponse.json({
      success: true,
      trustCenterUrl: updated.trustCenterUrl,
      platform: updated.trustCenterPlatform,
      matchedBy: client.websiteUrl ? 'website' : 'name',
    })
  } catch (error: any) {
    console.error('Error syncing trust center:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync trust center' },
      { status: 500 }
    )
  }
}

