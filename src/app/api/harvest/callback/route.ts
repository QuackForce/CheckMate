import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getIntegrationConfig } from '@/lib/integrations'

const HARVEST_TOKEN_URL = 'https://id.getharvest.com/api/v2/oauth2/token'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl.toString())
    }

    const harvestConfig = await getIntegrationConfig('harvest')
    const clientId = harvestConfig.apiKey // Client ID stored in apiKey field
    const clientSecret = harvestConfig.apiSecret
    const redirectUri = harvestConfig.config.redirectUri || process.env.HARVEST_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Harvest OAuth not configured. Please configure in Settings > Integrations.' },
        { status: 500 }
      )
    }

    const url = new URL(request.url)
    const code = url.searchParams.get('code')
    const scope = url.searchParams.get('scope') // Scope might contain account ID like "harvest:429185"
    
    // Try to extract account ID from scope (format: "harvest:ACCOUNT_ID" or just "harvest:429185")
    let accountIdFromScope: string | null = null
    if (scope) {
      const scopeMatch = scope.match(/harvest:(\d+)/)
      if (scopeMatch) {
        accountIdFromScope = scopeMatch[1]
      }
    }

    if (!code) {
      const teamUrl = new URL('/team', request.url)
      return NextResponse.redirect(teamUrl.toString())
    }

    // Exchange code for access token
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    let tokenRes
    try {
      tokenRes = await fetch(HARVEST_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    } catch (fetchError: any) {
      console.error('Harvest token exchange failed:', fetchError.message)
      return NextResponse.json(
        { error: 'Failed to connect to Harvest', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error('Harvest token error:', tokenRes.status, errText)
      return NextResponse.json({
        error: 'Harvest token exchange failed',
        status: tokenRes.status,
        details: errText,
      }, { status: 500 })
    }

    const tokenText = await tokenRes.text()
    
    let tokenJson: any
    try {
      tokenJson = JSON.parse(tokenText)
    } catch {
      console.error('Failed to parse Harvest token response')
      return NextResponse.json({
        error: 'Invalid JSON response from Harvest',
      }, { status: 500 })
    }

    const accessToken = tokenJson.access_token as string | undefined
    let harvestUserId = tokenJson.user?.id?.toString() || null
    // Try to get account ID from: 1) token response, 2) scope parameter, 3) API call
    let harvestAccountId = tokenJson.user?.accounts?.[0]?.id?.toString() || 
                           tokenJson.account_id?.toString() ||
                           accountIdFromScope ||
                           null

    if (!accessToken) {
      console.error('No access token in Harvest response')
      return NextResponse.json({
        error: 'No access token in Harvest response',
      }, { status: 500 })
    }

    // If account/user ID not in token response, fetch from Harvest API
    if (!harvestAccountId || !harvestUserId) {
      try {
        const userInfoRes = await fetch('https://api.harvestapp.com/api/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'JIT-Infra-Checks',
          },
        })

        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json()
          harvestUserId = userInfo.id?.toString() || harvestUserId
          harvestAccountId = userInfo.accounts?.[0]?.id?.toString() || harvestAccountId
        }
      } catch {
        // Continue without account ID - we'll try to fetch it later
      }
    }

    try {
      await db.user.update({
        where: { id: session.user.id },
        data: {
          harvestAccessToken: accessToken,
          harvestAccountId,
          harvestUserId,
        },
      })
    } catch (dbError: any) {
      console.error('Failed to save Harvest token:', dbError.message)
      return NextResponse.json({
        error: 'Database update failed',
        details: dbError.message,
      }, { status: 500 })
    }

    // Get return URL from cookie (where user was before OAuth)
    const returnTo = request.cookies.get('harvest_oauth_return_to')?.value || '/team'
    
    const redirectUrl = new URL(returnTo, request.url)
    redirectUrl.searchParams.set('harvest_connected', 'success')
    
    const response = NextResponse.redirect(redirectUrl.toString())
    response.cookies.delete('harvest_oauth_return_to')
    return response
  } catch (error: any) {
    console.error('Harvest OAuth callback error:', error.message)
    return NextResponse.json({
      error: 'Callback error',
      message: error.message,
    }, { status: 500 })
  }
}
