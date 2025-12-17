import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIntegrationConfig } from '@/lib/integrations'
import { requireEngineer } from '@/lib/auth-utils'
import { checkRateLimit, getIdentifier, getRateLimitHeaders, RATE_LIMITS } from '@/lib/rate-limit'

// POST /api/slack/post - Post a message to a Slack channel
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { error: authError, session } = await requireEngineer()
  if (authError) return authError

  try {
    // Rate limiting (general - posting messages)
    const identifier = getIdentifier(session?.user?.id, request)
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMITS.GENERAL)
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before posting more messages.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      )
    }
    const body = await request.json()
    const { checkId, message } = body

    if (!checkId || !message) {
      return NextResponse.json(
        { error: 'checkId and message are required' },
        { status: 400 }
      )
    }

    // Get the check with client and assigned engineer info
    const check = await db.infraCheck.findUnique({
      where: { id: checkId },
      include: {
        Client: {
          select: {
            id: true,
            name: true,
            slackChannelId: true,
            slackChannelName: true,
          },
        },
        User_InfraCheck_assignedEngineerIdToUser: {
          select: {
            id: true,
            name: true,
            slackUsername: true,
          },
        },
      },
    })

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 })
    }

    if (!check.Client.slackChannelId) {
      return NextResponse.json(
        { error: 'Client does not have a Slack channel configured' },
        { status: 400 }
      )
    }

    // Get Slack bot token
    const config = await getIntegrationConfig('slack')
    
    if (!config.apiKey || !config.enabled) {
      return NextResponse.json(
        { error: 'Slack is not configured' },
        { status: 400 }
      )
    }

    // Post message to Slack
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: check.Client.slackChannelId,
        text: message,
        mrkdwn: true, // Enable markdown formatting
        unfurl_links: false,
        unfurl_media: false,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      console.error('Slack API error:', data)
      return NextResponse.json(
        { 
          error: data.error || 'Failed to post to Slack',
          slackError: data.error,
        },
        { status: 400 }
      )
    }

    // Save the message timestamp to the check
    await db.infraCheck.update({
      where: { id: checkId },
      data: {
        slackMessageTs: data.ts,
      },
    })

    return NextResponse.json({
      success: true,
      messageTs: data.ts,
      channel: data.channel,
    })
  } catch (error: any) {
    console.error('Error posting to Slack:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to post to Slack' },
      { status: 500 }
    )
  }
}

