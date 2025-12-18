/**
 * Slack Events API Endpoint
 * 
 * Handles incoming events from Slack:
 * - URL verification (required for setup)
 * - app_home_opened (publishes home tab)
 * 
 * Setup in Slack:
 * 1. Go to api.slack.com/apps → Your App → Event Subscriptions
 * 2. Enable Events
 * 3. Set Request URL to: https://your-domain.com/api/slack/events
 * 4. Subscribe to: app_home_opened
 * 5. Save changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { publishHomeTab } from '@/lib/slack-home-tab'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle Slack URL verification challenge
    // This is sent when you first configure the Events URL in Slack
    if (body.type === 'url_verification') {
      console.log('Slack URL verification received')
      return NextResponse.json({ challenge: body.challenge })
    }

    // Handle event callbacks
    if (body.type === 'event_callback') {
      const event = body.event

      // Handle app_home_opened event
      if (event?.type === 'app_home_opened') {
        const slackUserId = event.user
        console.log(`Home tab opened by user: ${slackUserId}`)
        
        // Publish the home tab view (fire and forget)
        publishHomeTab(slackUserId).then(result => {
          if (!result.success) {
            console.error('Failed to publish home tab:', result.error)
          }
        })

        // Respond immediately (Slack expects response within 3 seconds)
        return NextResponse.json({ ok: true })
      }

      // Log unhandled events for debugging
      console.log('Unhandled Slack event:', event?.type)
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Slack events error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}







