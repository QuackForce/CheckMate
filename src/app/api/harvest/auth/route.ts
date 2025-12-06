import { NextRequest, NextResponse } from 'next/server'
import { getIntegrationConfig } from '@/lib/integrations'

const HARVEST_AUTH_URL = 'https://id.getharvest.com/oauth2/authorize'

export async function GET(request: NextRequest) {
  const harvestConfig = await getIntegrationConfig('harvest')
  const clientId = harvestConfig.apiKey // Client ID stored in apiKey field
  const redirectUri = harvestConfig.config.redirectUri || process.env.HARVEST_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Harvest OAuth not configured. Please configure in Settings > Integrations.' },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()
  
  // Get return URL from query params (where to redirect after OAuth)
  const returnTo = request.nextUrl.searchParams.get('returnTo') || '/team'

  // Build OAuth URL with proper encoding
  // Note: Harvest may use account-specific scopes (e.g., harvest:ACCOUNT_ID)
  // If no scope is specified, Harvest may grant default permissions
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state: state,
    // Don't specify scope - let Harvest use defaults or account-specific scope
  })

  // Store state and return URL in cookies for verification in callback
  const response = NextResponse.redirect(`${HARVEST_AUTH_URL}?${params.toString()}`)
  response.cookies.set('harvest_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  })
  response.cookies.set('harvest_oauth_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
  })
  return response
}


