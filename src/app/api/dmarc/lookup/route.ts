import { NextRequest, NextResponse } from 'next/server'
import { lookupDMARC } from '@/lib/dmarc'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')

  if (!domain) {
    return NextResponse.json(
      { error: 'Domain parameter is required' },
      { status: 400 }
    )
  }

  try {
    const result = await lookupDMARC(domain)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


