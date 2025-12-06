import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/harvest/projects?client_id=... - Get Harvest projects for a client
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('client_id')

    // Get user's Harvest token
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { harvestAccessToken: true, harvestAccountId: true },
    })

    if (!user?.harvestAccessToken || !user?.harvestAccountId) {
      return NextResponse.json(
        { error: 'Harvest not connected' },
        { status: 400 }
      )
    }

    // Build URL with optional client_id filter
    let url = 'https://api.harvestapp.com/api/v2/projects?is_active=true'
    if (clientId) {
      url += `&client_id=${clientId}`
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${user.harvestAccessToken}`,
        'Harvest-Account-Id': user.harvestAccountId,
        'User-Agent': 'JIT-Infra-Checks',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Harvest API error: ${error}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data.projects || [])
  } catch (error: any) {
    console.error('Error fetching Harvest projects:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Harvest projects' },
      { status: 500 }
    )
  }
}

