import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the role to find its roleKey
    const role = await db.roleConfiguration.findUnique({
      where: { id: params.id },
      select: { roleKey: true },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Count assignments using this role
    const count = await db.clientEngineerAssignment.count({
      where: { role: role.roleKey as any },
    })

    return NextResponse.json({ count })
  } catch (error: any) {
    console.error('Error counting role assignments:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to count assignments' },
      { status: 500 }
    )
  }
}

