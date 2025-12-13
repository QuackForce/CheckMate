import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireTeamManager } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

// DELETE /api/teams/[id]/clients/[clientId] - Remove a client from a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; clientId: string } }
) {
  try {
    const { error } = await requireTeamManager()
    if (error) return error

    // Verify team exists
    const team = await (db as any).team.findUnique({
      where: { id: params.id },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Remove the client-team association
    await (db as any).clientTeam.deleteMany({
      where: {
        teamId: params.id,
        clientId: params.clientId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing client from team:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove client from team' },
      { status: 500 }
    )
  }
}

