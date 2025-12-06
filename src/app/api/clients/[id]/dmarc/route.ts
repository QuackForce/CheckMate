import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lookupDMARC } from '@/lib/dmarc'

// Save DMARC result to client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { domain } = await request.json()
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Look up DMARC
    const result = await lookupDMARC(domain)
    
    // Update client with result
    const client = await db.client.update({
      where: { id: params.id },
      data: {
        dmarc: result.policy || 'Not Set',
        dmarcRecord: result.rawRecord,
        dmarcLastChecked: new Date(),
      },
    })

    return NextResponse.json({
      ...result,
      saved: true,
    })
  } catch (error: any) {
    console.error('DMARC save error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


