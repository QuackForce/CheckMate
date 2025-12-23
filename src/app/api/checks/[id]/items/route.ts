import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer } from '@/lib/auth-utils'

// POST /api/checks/[id]/items - Add a new check item to a category
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authError, session } = await requireEngineer()
  if (authError) {
    console.error('Auth error adding check item:', { 
      role: session?.user?.role,
      userId: session?.user?.id 
    })
    return authError
  }

  try {
    const body = await request.json()
    const { categoryId, text, isOptional, saveForClient } = body

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }
    if (!text) {
      return NextResponse.json({ error: 'Item text is required' }, { status: 400 })
    }

    // Get the check to find clientId
    const check = await db.infraCheck.findUnique({
      where: { id: params.id },
      select: { clientId: true },
    })

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 })
    }

    // Verify the category belongs to this check and get system info
    const category = await db.categoryResult.findFirst({
      where: {
        id: categoryId,
        checkId: params.id,
      },
      include: {
        ItemResult: true,
      },
    })

    if (!category) {
      console.error('Category not found:', { 
        categoryId, 
        checkId: params.id,
        userRole: session?.user?.role,
        userId: session?.user?.id
      })
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Find the system by matching category name to system name
    const system = await db.system.findFirst({
      where: {
        name: category.name,
        ClientSystem: {
          some: {
            clientId: check.clientId,
            isActive: true,
          },
        },
      },
      select: { id: true },
    })

    let clientSystemCheckItemId: string | null = null
    let source = 'CUSTOM'

    // If saveForClient is true, create/update ClientSystemCheckItem
    if (saveForClient && system) {
      // Check if item already exists for this client+system
      const existing = await db.clientSystemCheckItem.findUnique({
        where: {
          clientId_systemId_text: {
            clientId: check.clientId,
            systemId: system.id,
            text: text.trim(),
          },
        },
      })

      if (existing) {
        clientSystemCheckItemId = existing.id
        source = 'CLIENT_SPECIFIC'
      } else {
        // Get max order for this client+system
        const maxOrder = await db.clientSystemCheckItem.aggregate({
          where: {
            clientId: check.clientId,
            systemId: system.id,
          },
          _max: { order: true },
        })

        const clientItem = await db.clientSystemCheckItem.create({
          data: {
            id: crypto.randomUUID(),
            clientId: check.clientId,
            systemId: system.id,
            text: text.trim(),
            description: null,
            order: (maxOrder._max.order || 0) + 1,
            isOptional: isOptional || false,
            updatedAt: new Date(),
          },
        })

        clientSystemCheckItemId = clientItem.id
        source = 'CLIENT_SPECIFIC'
      }
    }

    // Get the next order number
    const nextOrder = category.ItemResult.length

    // Ensure database has the required columns (run once, safe to run multiple times)
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE "ItemResult" 
        ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'SYSTEM';
      `)
      await db.$executeRawUnsafe(`
        ALTER TABLE "ItemResult" 
        ADD COLUMN IF NOT EXISTS "clientSystemCheckItemId" TEXT;
      `)
      // After adding columns, regenerate Prisma client (user needs to restart server)
      console.warn('⚠️  Database columns added. Please run: npx prisma generate && restart server')
    } catch (e: any) {
      // Columns might already exist, ignore error
    }

    const itemId = crypto.randomUUID()
    const now = new Date().toISOString()
    const itemText = text.trim().replace(/'/g, "''") // Escape single quotes for SQL
    // Always set notes to '(Custom item)' for CUSTOM items so they can be identified even if source field isn't read by Prisma
    // This ensures the delete button will show even if Prisma doesn't return the source field
    const itemNotes = (source === 'CUSTOM' || (!saveForClient && source !== 'CLIENT_SPECIFIC')) ? '(Custom item)' : null
    const notesValue = itemNotes ? `'${itemNotes.replace(/'/g, "''")}'` : 'NULL'
    const clientSystemValue = clientSystemCheckItemId ? `'${clientSystemCheckItemId}'` : 'NULL'

    // Use raw SQL to insert since Prisma client doesn't have the fields yet
    await db.$executeRawUnsafe(`
      INSERT INTO "ItemResult" (
        id, "categoryResultId", text, checked, "order", notes, 
        "source", "clientSystemCheckItemId", "createdAt", "updatedAt"
      ) VALUES (
        '${itemId}', 
        '${categoryId}', 
        '${itemText}', 
        false, 
        ${nextOrder}, 
        ${notesValue},
        '${source}',
        ${clientSystemValue},
        '${now}',
        '${now}'
      )
    `)

    // Fetch the created item
    const item = await db.itemResult.findUnique({
      where: { id: itemId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
    }

    return NextResponse.json({
      item,
      message: saveForClient ? 'Item added and saved for this client!' : 'Item added successfully',
      savedForClient: saveForClient,
    })
  } catch (error: any) {
    console.error('Error adding check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

