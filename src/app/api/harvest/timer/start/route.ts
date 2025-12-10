import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/harvest/timer/start - Start a live timer in Harvest
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, taskId, notes, externalReference } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
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

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

    // Start timer in Harvest - create a time entry without hours to start a timer
    // Required fields: project_id, task_id, spent_date
    // Use local date, not UTC (toISOString uses UTC which can be wrong day)
    const today = new Date()
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    const timerData: any = {
      project_id: parseInt(projectId),
      task_id: parseInt(taskId),
      spent_date: localDate, // YYYY-MM-DD in local timezone
      notes: notes || '',
    }

    // Add external reference (URL) if provided - Harvest supports this for linking back to the source
    if (externalReference) {
      timerData.external_reference = {
        id: externalReference,
        permalink: externalReference,
      }
    }

    // To start a timer, create a time entry without hours - it will automatically start as a running timer
    const response = await fetch('https://api.harvestapp.com/api/v2/time_entries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.harvestAccessToken}`,
        'Harvest-Account-Id': user.harvestAccountId,
        'Content-Type': 'application/json',
        'User-Agent': 'JIT-Infra-Checks',
      },
      body: JSON.stringify(timerData),
    })

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        console.error('Harvest API error details:', errorData)
        // Harvest API returns errors in a specific format
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (Array.isArray(errorData)) {
          errorMessage = errorData.map((e: any) => e.message || e.field || JSON.stringify(e)).join(', ')
        }
      } catch {
        const errorText = await response.text()
        console.error('Harvest API error (text):', errorText.substring(0, 500))
        if (errorText) {
          errorMessage = errorText.substring(0, 200)
        }
      }
      return NextResponse.json(
        { error: `Harvest API error: ${errorMessage}` },
        { status: response.status }
      )
    }

    const timeEntry = await response.json()
    
    // Harvest returns the time entry in a time_entry property
    const entry = timeEntry.time_entry || timeEntry

    return NextResponse.json(entry)
  } catch (error: any) {
    console.error('Error starting Harvest timer:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start Harvest timer' },
      { status: 500 }
    )
  }
}
