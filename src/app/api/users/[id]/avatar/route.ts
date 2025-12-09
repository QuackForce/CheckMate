import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

// POST /api/users/[id]/avatar - Upload/replace user avatar
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const userId = params.id
    const isSelf = session.user.id === userId
    const isAdmin = session.user.role === 'ADMIN'

    // Allow user to update their own avatar, or admin to update anyone
    if (!isSelf && !isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - You can only change your own avatar' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Basic 2MB limit to avoid huge uploads
    const MAX_SIZE = 2 * 1024 * 1024
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 400 })
    }

    // Convert image to base64 data URL for storage in database
    // This works in serverless environments (Vercel) where filesystem is read-only
    const base64 = buffer.toString('base64')
    const mimeType = file.type || 'image/png'
    const dataUrl = `data:${mimeType};base64,${base64}`

    const user = await db.user.update({
      where: { id: userId },
      data: { image: dataUrl },
    })

    return NextResponse.json({
      success: true,
      image: dataUrl,
      user: {
        id: user.id,
        image: user.image,
      },
    })
  } catch (error: any) {
    console.error('Error uploading avatar:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}





