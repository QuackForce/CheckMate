import { NextRequest, NextResponse } from 'next/server';
import { syncClientsFromNotion, getNotionSyncStatus } from '@/lib/notion';
import { auth } from '@/lib/auth';
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get user for rate limiting
    const session = await auth();
    const identifier = getIdentifier(session?.user?.id, request);
    
    // Check rate limit (20 syncs per minute)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.SYNC);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please wait before syncing again.',
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
    
    const result = await syncClientsFromNotion();
    
    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} clients (${result.created} new, ${result.updated} updated)`,
      ...result,
    }, {
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Force dynamic rendering for this route

export async function GET() {
  try {
    const status = await getNotionSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}



