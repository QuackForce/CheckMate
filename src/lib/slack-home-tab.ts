/**
 * Slack Home Tab Configuration
 * 
 * Builds the Block Kit view for the CheckMate Slack app home tab.
 * This is a static view with quick links to the web app.
 */

import { getIntegrationConfig } from './integrations'

const APP_URL = process.env.NEXTAUTH_URL || 'https://check-mate-six.vercel.app'

/**
 * Get Slack bot token from integration settings
 */
async function getSlackToken(): Promise<string | null> {
  const config = await getIntegrationConfig('slack')
  if (!config.enabled || !config.apiKey) {
    return null
  }
  return config.apiKey
}

/**
 * Build the static home tab view
 */
function buildHomeTabView(): object {
  return {
    type: 'home',
    blocks: [
      // Header
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*✅ Welcome to CheckMate!*\n\nYour infrastructure monitoring and compliance check platform.',
        },
      },
      {
        type: 'divider',
      },
      // Quick Links Header
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*🔗 Quick Links*',
        },
      },
      // Navigation Buttons
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📊 Dashboard',
              emoji: true,
            },
            url: `${APP_URL}/dashboard`,
            action_id: 'link_dashboard',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✓ My Checks',
              emoji: true,
            },
            url: `${APP_URL}/checks`,
            action_id: 'link_checks',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📅 Schedule',
              emoji: true,
            },
            url: `${APP_URL}/schedule`,
            action_id: 'link_schedule',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🏢 Clients',
              emoji: true,
            },
            url: `${APP_URL}/clients`,
            action_id: 'link_clients',
          },
        ],
      },
      {
        type: 'divider',
      },
      // Info Section
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '💡 *Tip:* You\'ll receive DM reminders for your assigned checks. Manage your notification preferences in your <' + APP_URL + '/profile|Profile Settings>.',
          },
        ],
      },
      {
        type: 'divider',
      },
      // Footer
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🛠️ Built by Jones IT | <' + APP_URL + '|Open CheckMate>',
          },
        ],
      },
    ],
  }
}

/**
 * Publish the home tab view for a user
 */
export async function publishHomeTab(slackUserId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getSlackToken()
  if (!token) {
    return { success: false, error: 'Slack not configured' }
  }

  try {
    const response = await fetch('https://slack.com/api/views.publish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: slackUserId,
        view: buildHomeTabView(),
      }),
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Failed to publish home tab:', data.error)
      return { success: false, error: data.error }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error publishing home tab:', error)
    return { success: false, error: error.message }
  }
}

