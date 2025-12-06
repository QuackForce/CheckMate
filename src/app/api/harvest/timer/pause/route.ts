import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/harvest/timer/pause - Pause a timer in Harvest by setting hours
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { timerId, elapsedSeconds } = body

    if (!timerId) {
      return NextResponse.json(
        { error: 'timerId is required' },
        { status: 400 }
      )
    }

    // Get user's Harvest token
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        harvestAccessToken: true,
        harvestAccountId: true,
      },
    })

    if (!user?.harvestAccessToken || !user?.harvestAccountId) {
      return NextResponse.json(
        { error: 'Harvest not connected' },
        { status: 400 }
      )
    }

    // Convert seconds to hours (Harvest uses decimal hours)
    // Minimum 0.01 hours (36 seconds) as Harvest may not accept 0
    const hours = Math.max(0.01, (elapsedSeconds || 0) / 3600)

    // Pause the timer by setting hours - this stops the running timer
    const pauseResponse = await fetch(`https://api.harvestapp.com/api/v2/time_entries/${timerId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${user.harvestAccessToken}`,
        'Harvest-Account-Id': user.harvestAccountId,
        'Content-Type': 'application/json',
        'User-Agent': 'JIT-Infra-Checks',
      },
      body: JSON.stringify({
        hours: parseFloat(hours.toFixed(2)),
      }),
    })

    if (!pauseResponse.ok) {
      const errorText = await pauseResponse.text()
      let errorMessage = `Failed to pause timer: ${pauseResponse.status} ${pauseResponse.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch {
        if (errorText) {
          errorMessage = errorText.substring(0, 200)
        }
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: pauseResponse.status }
      )
    }

    const pausedTimerData = await pauseResponse.json()
    const pausedTimer = pausedTimerData.time_entry || pausedTimerData

    return NextResponse.json({
      id: pausedTimer.id,
      hours: pausedTimer.hours,
      message: 'Timer paused',
    })
  } catch (error: any) {
    console.error('Error pausing Harvest timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to pause Harvest timer' },
      { status: 500 }
    )
  }
}
