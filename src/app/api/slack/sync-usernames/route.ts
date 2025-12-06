import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getIntegrationConfig } from '@/lib/integrations'
import { requireAdmin } from '@/lib/auth-utils'

// POST /api/slack/sync-usernames - Sync Slack usernames by matching emails
export async function POST(request: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  try {
    // Get Slack bot token
    const config = await getIntegrationConfig('slack')
    
    if (!config.apiKey || !config.enabled) {
      return NextResponse.json(
        { error: 'Slack is not configured' },
        { status: 400 }
      )
    }

    // Get all users from our database who have emails but no Slack username
    const users = await db.user.findMany({
      where: {
        email: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        slackUsername: true,
        slackUserId: true,
      },
    })

    const results = {
      matched: 0,
      updated: 0,
      notFound: 0,
      errors: [] as string[],
    }

    // For each user, try to find their Slack username by email
    for (const user of users) {
      if (!user.email) continue

      try {
        // Look up user by email in Slack
        const response = await fetch(
          `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(user.email)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
            },
          }
        )

        const data = await response.json()

        if (!data.ok) {
          if (data.error === 'users_not_found') {
            // User not found in Slack - this is fine, just skip
            results.notFound++
            continue
          } else if (data.error === 'missing_scope') {
            // Bot doesn't have users:read.email scope
            return NextResponse.json(
              { 
                error: 'Bot is missing required scope: users:read.email',
                message: 'Please add the "users:read.email" scope to your Slack app in the Slack API settings.',
              },
              { status: 400 }
            )
          } else {
            results.errors.push(`${user.email}: ${data.error}`)
            continue
          }
        }

        if (data.user) {
          results.matched++
          // Store both display name (for UI display) and user ID (for @mentions)
          // Slack requires <@USER_ID> format for mentions to work properly
          const slackUsername = data.user.profile?.display_name || data.user.name || null
          const slackUserId = data.user.id // User ID required for mentions (e.g., "U1234567890")
          
          console.log(`Syncing Slack for ${user.email}:`, {
            slackUsername,
            slackUserId,
            currentSlackUsername: user.slackUsername,
            currentSlackUserId: user.slackUserId,
          })
          
          // Update if either field is different or not set
          if (user.slackUsername !== slackUsername || user.slackUserId !== slackUserId) {
            await db.user.update({
              where: { id: user.id },
              data: { 
                slackUsername,
                slackUserId,
              },
            })
            results.updated++
            console.log(`Updated Slack data for ${user.email}`)
          } else {
            console.log(`No update needed for ${user.email}`)
          }
        }
      } catch (error: any) {
        results.errors.push(`${user.email}: ${error.message}`)
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({
      success: true,
      results: {
        total: users.length,
        matched: results.matched,
        updated: results.updated,
        notFound: results.notFound,
        errors: results.errors.length,
        errorDetails: results.errors.slice(0, 10), // Limit error details
      },
    })
  } catch (error: any) {
    console.error('Error syncing Slack usernames:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync Slack usernames' },
      { status: 500 }
    )
  }
}

