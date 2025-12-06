import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/harvest/timer/resume - Resume a paused timer in Harvest
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { timerId } = body

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

    // Resume the timer using Harvest's restart endpoint
    const resumeResponse = await fetch(`https://api.harvestapp.com/api/v2/time_entries/${timerId}/restart`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${user.harvestAccessToken}`,
        'Harvest-Account-Id': user.harvestAccountId,
        'User-Agent': 'JIT-Infra-Checks',
      },
    })

    if (!resumeResponse.ok) {
      const errorText = await resumeResponse.text()
      let errorMessage = `Failed to resume timer: ${resumeResponse.status} ${resumeResponse.statusText}`
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
        { status: resumeResponse.status }
      )
    }

    const resumedTimerData = await resumeResponse.json()
    const resumedTimer = resumedTimerData.time_entry || resumedTimerData

    return NextResponse.json({
      id: resumedTimer.id,
      hours: resumedTimer.hours,
      is_running: resumedTimer.is_running,
      message: 'Timer resumed',
    })
  } catch (error: any) {
    console.error('Error resuming Harvest timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resume Harvest timer' },
      { status: 500 }
    )
  }
}
