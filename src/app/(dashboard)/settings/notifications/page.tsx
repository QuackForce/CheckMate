'use client'

import { useState } from 'react'
import { Bell, MessageSquare, Send, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const [sendingReminders, setSendingReminders] = useState(false)
  const [lastResult, setLastResult] = useState<any>(null)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handlePreviewReminders = async () => {
    setPreviewing(true)
    try {
      const res = await fetch('/api/notifications/send-reminders')
      const data = await res.json()
      setPreview(data)
    } catch (error) {
      toast.error('Failed to preview reminders')
    } finally {
      setPreviewing(false)
    }
  }

  const handleSendReminders = async () => {
    setShowConfirmModal(false)
    setSendingReminders(true)
    setLastResult(null)
    
    try {
      const res = await fetch('/api/notifications/send-reminders', {
        method: 'POST',
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success(`Sent ${data.sent} reminders`)
        setLastResult(data)
      } else {
        toast.error(data.error || 'Failed to send reminders')
      }
    } catch (error) {
      toast.error('Failed to send reminders')
    } finally {
      setSendingReminders(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <p className="text-sm text-surface-400 mt-1">
          Configure and send Slack notifications to your team
        </p>
      </div>

      {/* Slack Reminders Section */}
      <div className="card">
        <div className="p-4 border-b border-surface-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Slack Reminders</h3>
              <p className="text-sm text-surface-400">
                Send DM reminders to engineers with checks due today or overdue
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviewReminders}
              disabled={previewing}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              {previewing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              Preview
            </button>
            
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={sendingReminders}
              className="btn-primary text-sm flex items-center gap-2"
            >
              {sendingReminders ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Reminders Now
            </button>
          </div>

          {/* Confirmation Modal */}
          {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowConfirmModal(false)}
              />
              <div className="relative bg-surface-800 border border-surface-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="absolute top-4 right-4 text-surface-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Send className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Send Reminders</h3>
                </div>
                
                <p className="text-surface-300 mb-6">
                  Send Slack DM reminders to all assigned engineers with checks due today or overdue?
                </p>
                
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReminders}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Reminders
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview Results */}
          {preview && (
            <div className="bg-surface-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-surface-400">
                  Total: <span className="text-white font-medium">{preview.total}</span>
                </span>
                <span className="text-surface-400">
                  Would send: <span className="text-emerald-400 font-medium">{preview.wouldSend}</span>
                </span>
                <span className="text-surface-400">
                  No Slack: <span className="text-yellow-400 font-medium">{preview.wouldSkip}</span>
                </span>
                {preview.optedOut > 0 && (
                  <span className="text-surface-400">
                    Opted out: <span className="text-surface-500 font-medium">{preview.optedOut}</span>
                  </span>
                )}
              </div>

              {preview.checks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-surface-500 uppercase tracking-wide">Checks to remind:</p>
                  <div className="divide-y divide-surface-700/50">
                    {preview.checks.map((check: any, i: number) => (
                      <div key={i} className="py-2 flex items-center justify-between text-sm">
                        <div>
                          <span className="text-white">{check.client}</span>
                          <span className="text-surface-500 mx-2">→</span>
                          <span className="text-surface-400">{check.assignedTo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {check.isOverdue && (
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                              Overdue
                            </span>
                          )}
                          {check.wouldSend ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : !check.hasSlackId ? (
                            <span title="No Slack ID">
                              <AlertCircle className="w-4 h-4 text-yellow-400" />
                            </span>
                          ) : (
                            <span title="User opted out" className="text-xs text-surface-500">
                              Opted out
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.checks?.length === 0 && (
                <p className="text-sm text-surface-500">No checks due today or overdue</p>
              )}
            </div>
          )}

          {/* Send Results */}
          {lastResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-white font-medium">
                    Reminders sent successfully
                  </p>
                  <p className="text-sm text-surface-400">
                    Sent: {lastResult.sent} • Skipped: {lastResult.skipped} • Opted out: {lastResult.optedOut || 0} • Failed: {lastResult.failed}
                  </p>
                  {lastResult.errors?.length > 0 && (
                    <div className="mt-2 text-xs text-red-400">
                      Errors: {lastResult.errors.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-surface-800/50 border border-surface-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-2">How Slack Notifications Work</h4>
        <ul className="text-sm text-surface-400 space-y-1">
          <li>• Reminders are sent as DMs to the assigned engineer</li>
          <li>• Engineers must have their Slack username set in their profile</li>
          <li>• The Slack bot must be configured in Settings → Integrations</li>
          <li>• You can set up a daily cron job to auto-send reminders</li>
        </ul>
      </div>

      {/* Future: Automated Reminders */}
      <div className="card opacity-60">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-700">
              <Bell className="w-5 h-5 text-surface-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Automated Daily Reminders</h3>
              <p className="text-sm text-surface-400">
                Coming soon: Auto-send reminders every morning
              </p>
            </div>
          </div>
          <span className="text-xs text-surface-500 bg-surface-700 px-2 py-1 rounded">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  )
}
