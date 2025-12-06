import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/harvest/timer/running - Get the currently running timer in Harvest
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's Harvest token
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        harvestAccessToken: true,
        harvestAccountId: true,
        harvestUserId: true,
      },
    })

    if (!user?.harvestAccessToken || !user?.harvestAccountId) {
      return NextResponse.json(
        { error: 'Harvest not connected' },
        { status: 400 }
      )
    }

    // Get currently running timer
    const response = await fetch('https://api.harvestapp.com/api/v2/time_entries/running', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.harvestAccessToken}`,
        'Harvest-Account-Id': user.harvestAccountId,
        'User-Agent': 'JIT-Infra-Checks',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        // No timer running
        return NextResponse.json({ id: null, time_entry: null })
      }
      const error = await response.text()
      return NextResponse.json(
        { error: `Harvest API error: ${error}` },
        { status: response.status }
      )
    }

    const runningTimerData = await response.json()
    // Harvest may wrap the response in a time_entry property
    const runningTimer = runningTimerData.time_entry || runningTimerData

    return NextResponse.json(runningTimer)
  } catch (error: any) {
    console.error('Error getting running Harvest timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get running timer' },
      { status: 500 }
    )
  }
}

