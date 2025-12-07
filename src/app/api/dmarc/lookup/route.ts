import { NextRequest, NextResponse } from 'next/server'
import { lookupDMARC } from '@/lib/dns-security'
import { auth } from '@/lib/auth'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Get user for rate limiting (falls back to IP if not authenticated)
  const session = await auth()
  const identifier = getIdentifier(session?.user?.id, request)
  
  // Check rate limit (30 lookups per minute)
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.LOOKUP)
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded. Please wait before making more lookups.',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      },
      { 
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    )
  }

  const domain = request.nextUrl.searchParams.get('domain')

  if (!domain) {
    return NextResponse.json(
      { error: 'Domain parameter is required' },
      { status: 400 }
    )
  }

  try {
    const result = await lookupDMARC(domain)
    return NextResponse.json(result, {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


