import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendCheckReminder } from '@/lib/slack-notifications'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/send-reminders
 * 
 * Sends Slack reminders for checks that are:
 * - Due today
 * - Overdue
 * 
 * Can be called manually or via cron job
 */
export async function POST() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    // Get checks due today or overdue
    const checks = await db.infraCheck.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          // Due today
          { scheduledDate: { gte: todayStart, lt: todayEnd } },
          // Overdue (before today)
          { scheduledDate: { lt: todayStart } },
        ],
      },
      include: {
        client: { select: { name: true } },
        assignedEngineer: { 
          select: { id: true, slackUserId: true, name: true } 
        },
      },
    })

    const results = {
      total: checks.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      optedOut: 0,
      errors: [] as string[],
    }

    for (const check of checks) {
      // Skip if no assigned engineer or no Slack ID
      if (!check.assignedEngineer?.id) {
        results.skipped++
        continue
      }

      if (!check.assignedEngineer.slackUserId) {
        results.skipped++
        continue
      }

      const isOverdue = check.scheduledDate < todayStart

      const result = await sendCheckReminder(
        check.assignedEngineer.id,
        check.id,
        check.client.name,
        check.scheduledDate,
        isOverdue
      )

      if (result.success) {
        results.sent++
      } else if (result.error?.includes('disabled')) {
        // User opted out
        results.optedOut++
      } else {
        results.failed++
        results.errors.push(`${check.client.name}: ${result.error}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${results.sent} reminders`,
      ...results,
    })
  } catch (error: any) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/send-reminders
 * 
 * Preview what reminders would be sent (dry run)
 */
export async function GET() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const checks = await db.infraCheck.findMany({
      where: {
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        OR: [
          { scheduledDate: { gte: todayStart, lt: todayEnd } },
          { scheduledDate: { lt: todayStart } },
        ],
      },
      include: {
        client: { select: { name: true } },
        assignedEngineer: { 
          select: { 
            id: true, 
            slackUserId: true, 
            name: true,
            notifySlackReminders: true,
            notifyOverdueChecks: true,
          } 
        },
      },
    })

    const preview = checks.map(check => {
      const isOverdue = check.scheduledDate < todayStart
      const hasSlackId = !!check.assignedEngineer?.slackUserId
      const remindersEnabled = check.assignedEngineer?.notifySlackReminders !== false
      const overdueEnabled = check.assignedEngineer?.notifyOverdueChecks !== false
      
      // Determine if would actually send
      let wouldSend = hasSlackId && remindersEnabled
      if (isOverdue && !overdueEnabled) {
        wouldSend = false
      }

      return {
        client: check.client.name,
        assignedTo: check.assignedEngineer?.name || check.assignedEngineerName || 'Unassigned',
        hasSlackId,
        remindersEnabled,
        overdueEnabled,
        isOverdue,
        wouldSend,
        scheduledDate: check.scheduledDate,
      }
    })

    return NextResponse.json({
      total: preview.length,
      wouldSend: preview.filter(p => p.wouldSend).length,
      wouldSkip: preview.filter(p => !p.hasSlackId).length,
      optedOut: preview.filter(p => p.hasSlackId && !p.wouldSend).length,
      checks: preview,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

