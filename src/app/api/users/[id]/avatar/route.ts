import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import path from 'path'
import { promises as fs } from 'fs'

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

    const ext = file.type === 'image/png'
      ? 'png'
      : file.type === 'image/jpeg'
      ? 'jpg'
      : file.type === 'image/gif'
      ? 'gif'
      : 'png'

    const fileName = `avatar-${userId}-${Date.now()}.${ext}`
    const avatarsDir = path.join(process.cwd(), 'public', 'avatars')

    await fs.mkdir(avatarsDir, { recursive: true })

    const filePath = path.join(avatarsDir, fileName)
    await fs.writeFile(filePath, buffer)

    const publicPath = `/avatars/${fileName}`

    const user = await db.user.update({
      where: { id: userId },
      data: { image: publicPath },
    })

    return NextResponse.json({
      success: true,
      image: publicPath,
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




