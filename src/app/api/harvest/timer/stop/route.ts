import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/harvest/timer/stop - Stop a timer in Harvest by setting hours (keeps the entry)
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

    // Convert seconds to hours (minimum 0.01 = ~36 seconds)
    const hours = Math.max(0.01, (elapsedSeconds || 0) / 3600)

    // Stop the timer by setting hours - this finalizes the time entry
    const stopResponse = await fetch(`https://api.harvestapp.com/api/v2/time_entries/${timerId}`, {
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

    if (!stopResponse.ok) {
      if (stopResponse.status === 404) {
        return NextResponse.json({ 
          message: 'Timer entry not found',
          id: null 
        })
      }
      
      const errorText = await stopResponse.text()
      let errorMessage = `Failed to stop timer: ${stopResponse.status} ${stopResponse.statusText}`
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
        { status: stopResponse.status }
      )
    }

    const stoppedTimerData = await stopResponse.json()
    const stoppedTimer = stoppedTimerData.time_entry || stoppedTimerData

    return NextResponse.json({ 
      message: 'Timer stopped',
      id: stoppedTimer.id,
      hours: stoppedTimer.hours,
    })
  } catch (error: any) {
    console.error('Error stopping Harvest timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to stop Harvest timer' },
      { status: 500 }
    )
  }
}
