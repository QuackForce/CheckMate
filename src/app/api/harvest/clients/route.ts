import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/harvest/clients - Get Harvest clients for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's Harvest token
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { harvestAccessToken: true, harvestAccountId: true },
    })

    if (!user?.harvestAccessToken) {
      return NextResponse.json(
        { error: 'Harvest not connected' },
        { status: 400 }
      )
    }

    // If account ID not saved, we need to get it from Harvest
    let accountId = user.harvestAccountId
    if (!accountId) {
      try {
        // Try /users/me - this endpoint might work without account ID header
        const userInfoRes = await fetch('https://api.harvestapp.com/api/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${user.harvestAccessToken}`,
            'User-Agent': 'JIT-Infra-Checks',
          },
        })

        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json()
          accountId = userInfo.accounts?.[0]?.id?.toString() || null
          
          // Save account ID for future use
          if (accountId) {
            await db.user.update({
              where: { id: session.user.id },
              data: { harvestAccountId: accountId },
            })
          }
        }
      } catch {
        // Continue - will error out below if no account ID
      }
    }

    // Fetch projects instead of clients (user may not have clients:read permission)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Could not determine Harvest account ID. Please reconnect Harvest.' },
        { status: 400 }
      )
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${user.harvestAccessToken}`,
      'Harvest-Account-Id': accountId,
      'User-Agent': 'JIT-Infra-Checks',
    }

    // Fetch active projects (which include client info)
    const response = await fetch('https://api.harvestapp.com/api/v2/projects?is_active=true&per_page=200', {
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Harvest authentication failed. Please reconnect.',
            details: errorText,
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Harvest API error: ${errorText}`,
          status: response.status,
        },
        { status: 400 }
      )
    }

    const data = await response.json()
    const projects = data.projects || []
    
    // Return projects directly (in their setup, projects = clients)
    const formattedProjects = projects.map((project: any) => ({
      id: project.id.toString(),
      name: project.name,
      client_id: project.client?.id?.toString() || null,
      client_name: project.client?.name || null,
    }))
    
    return NextResponse.json(formattedProjects)
  } catch (error: any) {
    console.error('Harvest clients error:', error.message)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Harvest clients' },
      { status: 500 }
    )
  }
}
