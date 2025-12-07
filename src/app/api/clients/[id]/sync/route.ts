import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncSingleClient } from '@/lib/notion'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting
    const session = await auth()
    const identifier = getIdentifier(session?.user?.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.SYNC)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before syncing again.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }
    // First, get the client to find their Notion page ID
    const client = await db.client.findUnique({
      where: { id: params.id },
      select: { notionPageId: true, name: true },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!client.notionPageId) {
      return NextResponse.json(
        { success: false, error: 'Client is not linked to Notion' },
        { status: 400 }
      )
    }

    // Sync from Notion
    const result = await syncSingleClient(client.notionPageId)

    return NextResponse.json({
      success: true,
      message: `Synced "${result.client.name}" from Notion`,
      systemsLinked: result.systemsLinked,
      isNew: result.isNew,
    })
  } catch (error: any) {
    console.error('Single client sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}


