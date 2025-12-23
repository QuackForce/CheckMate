import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/harvest/status - Check if Harvest is connected
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false, error: 'Not authenticated' })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        harvestAccessToken: true,
        harvestAccountId: true,
        harvestUserId: true,
      },
    })

    if (!user?.harvestAccessToken) {
      return NextResponse.json({ 
        connected: false, 
        reason: 'Harvest not connected',
      })
    }

    return NextResponse.json({ 
      connected: true,
      accountId: user.harvestAccountId,
      userId: user.harvestUserId,
    })
  } catch (error: any) {
    console.error('Harvest status error:', error)
    return NextResponse.json({ connected: false, error: error.message })
  }
}

// DELETE /api/harvest/status - Disconnect Harvest
// Force dynamic rendering for this route

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await db.user.update({
      where: { id: session.user.id },
      data: {
        harvestAccessToken: null,
        harvestAccountId: null,
        harvestUserId: null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Harvest disconnect error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}












