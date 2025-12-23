import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireEngineer } from '@/lib/auth-utils'

// DELETE /api/checks/[id]/items/[itemId] - Remove a check item
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> | { id: string; itemId: string } }
) {
  const { error: authError, session } = await requireEngineer()
  if (authError) {
    return authError
  }

  try {
    const resolvedParams = await Promise.resolve(params)
    const { id: checkId, itemId } = resolvedParams

    // Get the item to check its source
    // Use type assertion to access source field since Prisma client doesn't have it yet
    const item = await db.itemResult.findUnique({
      where: { id: itemId },
      include: {
        CategoryResult: {
          include: {
            InfraCheck: {
              select: { id: true, clientId: true },
            },
          },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Verify the item belongs to this check
    if (item.CategoryResult.checkId !== checkId) {
      return NextResponse.json({ error: 'Item does not belong to this check' }, { status: 403 })
    }

    // Access source field using type assertion
    const itemAny = item as any
    let source = itemAny.source
    
    // If source is not set, we need to determine if it's a system item
    // System items come from SystemCheckItem, so we can check if this item text
    // exists in the SystemCheckItem table for the corresponding system
    if (!source) {
      // Get the category to find the system
      const category = await db.categoryResult.findUnique({
        where: { id: item.categoryResultId },
        include: {
          InfraCheck: {
            include: {
              Client: {
                include: {
                  ClientSystem: {
                    where: { isActive: true },
                    include: {
                      System: {
                        include: {
                          SystemCheckItem: {
                            where: { text: item.text },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
      
      // Check if this item text exists in any SystemCheckItem for this client's systems
      const isSystemItem = category?.InfraCheck.Client.ClientSystem.some(
        cs => cs.System.SystemCheckItem.some(sci => sci.text === item.text)
      )
      
      if (isSystemItem) {
        source = 'SYSTEM'
      } else if (item.notes === '(Custom item)') {
        source = 'CUSTOM'
      }
    }

    // Only allow deletion of CUSTOM or CLIENT_SPECIFIC items (not SYSTEM items)
    if (source === 'SYSTEM') {
      return NextResponse.json({ 
        error: 'Cannot delete system items. These are global items that appear in all checks.' 
      }, { status: 400 })
    }

    const wasClientSpecific = source === 'CLIENT_SPECIFIC'

    // Delete the item
    await db.itemResult.delete({
      where: { id: itemId },
    })

    return NextResponse.json({
      success: true,
      message: wasClientSpecific 
        ? 'Item removed from this check. It will still appear in future checks for this client.'
        : 'Item removed successfully',
      wasClientSpecific,
    })
  } catch (error: any) {
    console.error('Error deleting check item:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

