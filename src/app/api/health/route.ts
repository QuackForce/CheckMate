import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * 
 * Simple health check endpoint that pings the database.
 * Use with a cron job to keep Supabase free tier from pausing.
 * 
 * Can be called with or without CRON_SECRET (it's just a ping)
 */
export async function GET(req: NextRequest) {
  try {
    // Simple database ping
    await db.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error: any) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error.message,
      },
      { status: 503 }
    )
  }
}
