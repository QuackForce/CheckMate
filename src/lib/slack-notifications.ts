/**
 * Slack Notification Utilities
 * 
 * Sends DMs and channel messages to users via Slack bot
 */

import { getIntegrationConfig } from './integrations'
import { db } from './db'

interface SlackMessageResult {
  success: boolean
  error?: string
  messageTs?: string
}

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
 * Send a DM to a user by their Slack user ID
 */
export async function sendSlackDM(
  slackUserId: string,
  message: string
): Promise<SlackMessageResult> {
  const token = await getSlackToken()
  if (!token) {
    return { success: false, error: 'Slack not configured' }
  }

  try {
    // Open a DM channel with the user
    const openRes = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users: slackUserId }),
    })

    const openData = await openRes.json()
    if (!openData.ok) {
      return { success: false, error: `Failed to open DM: ${openData.error}` }
    }

    const channelId = openData.channel.id

    // Send the message
    const msgRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: message,
        mrkdwn: true,
        unfurl_links: false,
        unfurl_media: false,
      }),
    })

    const msgData = await msgRes.json()
    if (!msgData.ok) {
      return { success: false, error: `Failed to send message: ${msgData.error}` }
    }

    return { success: true, messageTs: msgData.ts }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Send a notification to a user about an assigned check
 */
export async function notifyCheckAssigned(
  userId: string,
  checkId: string,
  clientName: string,
  scheduledDate: Date
): Promise<SlackMessageResult> {
  // Get user's Slack ID
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { slackUserId: true, name: true },
  })

  if (!user?.slackUserId) {
    return { success: false, error: 'User has no Slack ID' }
  }

  // Format date in Pacific timezone to match user expectations
  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })

  const message = `🔔 *New Check Assigned*\n\nYou've been assigned an infrastructure check for *${clientName}*.\n\n📅 Scheduled: ${dateStr}\n\n<${process.env.NEXTAUTH_URL}/checks/${checkId}|View Check>`

  return sendSlackDM(user.slackUserId, message)
}

/**
 * Format a single check reminder block
 */
function formatCheckBlock(
  checkId: string,
  clientName: string,
  scheduledDate: Date,
  isOverdue: boolean
): string {
  // Format date in Pacific timezone to match user expectations
  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles',
  })

  const emoji = isOverdue ? '⚠️' : '⏰'
  const title = isOverdue ? 'Overdue Check' : 'Check Reminder'
  const urgency = isOverdue 
    ? 'This check is now *overdue*. Please complete it as soon as possible.'
    : 'This check is scheduled for today.'

  const baseUrl = process.env.NEXTAUTH_URL
  const startLink = `<${baseUrl}/checks/${checkId}|Start Check>`
  const rescheduleLink = `<${baseUrl}/checks/${checkId}?action=reschedule|Reschedule>`

  return `${emoji} *${title}*\n\nYou have an infrastructure check for *${clientName}*.\n\n📅 ${isOverdue ? 'Was due' : 'Due'}: ${dateStr}\n\n${urgency}\n\n${startLink}  •  ${rescheduleLink}`
}

interface CheckReminder {
  checkId: string
  clientName: string
  scheduledDate: Date
  isOverdue: boolean
}

/**
 * Send batched reminders for multiple checks to a single user
 * Groups all checks into one message with dividers
 */
export async function sendBatchedReminders(
  userId: string,
  checks: CheckReminder[]
): Promise<SlackMessageResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { 
      slackUserId: true, 
      name: true,
      notifySlackReminders: true,
      notifyOverdueChecks: true,
    },
  })

  if (!user?.slackUserId) {
    return { success: false, error: 'User has no Slack ID' }
  }

  // Check user preferences
  if (!user.notifySlackReminders) {
    return { success: false, error: 'User has disabled Slack reminders' }
  }

  // Filter out overdue checks if user has disabled overdue notifications
  const filteredChecks = checks.filter(check => {
    if (check.isOverdue && !user.notifyOverdueChecks) {
      return false
    }
    return true
  })

  if (filteredChecks.length === 0) {
    return { success: false, error: 'All checks filtered by user preferences' }
  }

  // Build message with dividers between checks
  const divider = '\n\n━━━━━━━━━━━━━━━━━━━━\n\n'
  
  const messageBlocks = filteredChecks.map(check => 
    formatCheckBlock(check.checkId, check.clientName, check.scheduledDate, check.isOverdue)
  )

  // Add header if multiple checks
  let message: string
  if (filteredChecks.length > 1) {
    message = `📋 *You have ${filteredChecks.length} checks requiring attention*\n${divider}${messageBlocks.join(divider)}`
  } else {
    message = messageBlocks[0]
  }

  return sendSlackDM(user.slackUserId, message)
}

/**
 * Send a reminder about an upcoming check (single check)
 * Respects user notification preferences
 */
export async function sendCheckReminder(
  userId: string,
  checkId: string,
  clientName: string,
  scheduledDate: Date,
  isOverdue: boolean = false
): Promise<SlackMessageResult> {
  // Use batched function for single check too (for consistency)
  return sendBatchedReminders(userId, [{
    checkId,
    clientName,
    scheduledDate,
    isOverdue,
  }])
}

/**
 * Send notification when a check is completed
 */
export async function notifyCheckCompleted(
  userId: string,
  checkId: string,
  clientName: string,
  completedByName: string
): Promise<SlackMessageResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { slackUserId: true },
  })

  if (!user?.slackUserId) {
    return { success: false, error: 'User has no Slack ID' }
  }

  const message = `✅ *Check Completed*\n\n${completedByName} completed the infrastructure check for *${clientName}*.\n\n<${process.env.NEXTAUTH_URL}/checks/${checkId}|View Report>`

  return sendSlackDM(user.slackUserId, message)
}

/**
 * Send a test notification to verify Slack is working
 */
export async function sendTestNotification(slackUserId: string): Promise<SlackMessageResult> {
  return sendSlackDM(
    slackUserId,
    '👋 *Test Notification*\n\nThis is a test message from CheckMate. Your Slack notifications are working!'
  )
}

