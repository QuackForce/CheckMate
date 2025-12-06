import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-utils'
import { clearNotionConfigCache } from '@/lib/notion'
import { clearIntegrationConfigCache } from '@/lib/integrations'

// POST /api/integrations/[provider]/clear-cache - Clear integration config cache
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    await requireAdmin()
    
    if (params.provider === 'notion') {
      clearNotionConfigCache()
    }
    
    clearIntegrationConfigCache(params.provider)
    
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

