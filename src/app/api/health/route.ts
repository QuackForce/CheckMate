import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Health check endpoint - use this for keep-warm pings
// No auth required so monitoring services can access it
export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  
  try {
    // Quick database ping - just count 1 row to verify connection
    await db.client.findFirst({ select: { id: true } })
    
    const dbLatency = Date.now() - start
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      latency: `${dbLatency}ms`,
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'unhealthy', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    }, { status: 503 })
  }
}

