import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/harvest/projects/[projectId]/tasks - Get tasks for a Harvest project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> | { projectId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    const projectId = resolvedParams.projectId

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

    // Fetch project assignments which include tasks
    const response = await fetch(
      `https://api.harvestapp.com/api/v2/projects/${projectId}/task_assignments`,
      {
        headers: {
          'Authorization': `Bearer ${user.harvestAccessToken}`,
          'Harvest-Account-Id': user.harvestAccountId,
          'User-Agent': 'JIT-Infra-Checks',
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json(
        { error: `Harvest API error: ${error}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    // Extract tasks from task assignments
    const tasks = (data.task_assignments || []).map((ta: any) => ({
      id: ta.task.id,
      name: ta.task.name,
      billable: ta.billable,
      hourly_rate: ta.hourly_rate,
    }))

    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('Error fetching Harvest tasks:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Harvest tasks' },
      { status: 500 }
    )
  }
}


