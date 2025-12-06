import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/harvest/time-entries - Create a time entry in Harvest
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, taskId, hours, notes, spentDate, checkId, externalReference } = body

    if (!projectId || !hours) {
      return NextResponse.json(
        { error: 'projectId and hours are required' },
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

    // Create time entry in Harvest
    // Use local date, not UTC (toISOString uses UTC which can be wrong day)
    const today = new Date()
    const localDate = spentDate || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    const timeEntryData: any = {
      project_id: parseInt(projectId),
      spent_date: localDate, // YYYY-MM-DD in local timezone
      hours: parseFloat(hours.toFixed(2)),
      notes: notes || '',
    }

    if (taskId) {
      timeEntryData.task_id = parseInt(taskId)
    }

    // Add external reference (URL) if provided
    if (externalReference) {
      timeEntryData.external_reference = {
        id: externalReference,
        permalink: externalReference,
      }
    }

    const response = await fetch('https://api.harvestapp.com/api/v2/time_entries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.harvestAccessToken}`,
        'Harvest-Account-Id': user.harvestAccountId,
        'Content-Type': 'application/json',
        'User-Agent': 'JIT-Infra-Checks',
      },
      body: JSON.stringify(timeEntryData),
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Harvest API error: ${error}` },
        { status: response.status }
      )
    }

    const timeEntry = await response.json()

    // Optionally store the Harvest time entry ID on the check
    if (checkId) {
      await db.infraCheck.update({
        where: { id: checkId },
        data: {
          // We could add harvestTimeEntryId to schema if needed
          totalTimeSeconds: Math.round(hours * 3600),
        },
      })
    }

    return NextResponse.json(timeEntry)
  } catch (error: any) {
    console.error('Error creating Harvest time entry:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Harvest time entry' },
      { status: 500 }
    )
  }
}

