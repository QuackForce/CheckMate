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

  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const message = `🔔 *New Check Assigned*\n\nYou've been assigned an infrastructure check for *${clientName}*.\n\n📅 Scheduled: ${dateStr}\n\n<${process.env.NEXTAUTH_URL}/checks/${checkId}|View Check>`

  return sendSlackDM(user.slackUserId, message)
}

/**
 * Send a reminder about an upcoming check
 */
export async function sendCheckReminder(
  userId: string,
  checkId: string,
  clientName: string,
  scheduledDate: Date,
  isOverdue: boolean = false
): Promise<SlackMessageResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { slackUserId: true, name: true },
  })

  if (!user?.slackUserId) {
    return { success: false, error: 'User has no Slack ID' }
  }

  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const emoji = isOverdue ? '⚠️' : '⏰'
  const title = isOverdue ? 'Overdue Check' : 'Check Reminder'
  const urgency = isOverdue 
    ? 'This check is now *overdue*. Please complete it as soon as possible.'
    : 'This check is scheduled for today.'

  const message = `${emoji} *${title}*\n\nYou have an infrastructure check for *${clientName}*.\n\n📅 ${isOverdue ? 'Was due' : 'Due'}: ${dateStr}\n\n${urgency}\n\n<${process.env.NEXTAUTH_URL}/checks/${checkId}|Start Check>`

  return sendSlackDM(user.slackUserId, message)
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

