import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { clearNotionConfigCache } from '@/lib/notion'

// POST /api/integrations/notion/clear-cache - Clear Notion config cache
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    
    clearNotionConfigCache()
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to clear cache' },
      { status: 500 }
    )
  }
}


