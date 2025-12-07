import { Bell, Mail, MessageSquare, Calendar } from 'lucide-react'

export default function NotificationsPage() {
  const notifications = [
    {
      name: 'Check Reminders',
      description: 'Get reminded about upcoming and overdue checks',
      icon: Calendar,
      enabled: true,
    },
    {
      name: 'Email Notifications',
      description: 'Receive email summaries and alerts',
      icon: Mail,
      enabled: false,
    },
    {
      name: 'Slack Notifications',
      description: 'Get notified in Slack about check updates',
      icon: MessageSquare,
      enabled: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Notifications</h2>
        <p className="text-sm text-surface-400 mt-1">
          Configure how and when you receive notifications
        </p>
      </div>

      <div className="card divide-y divide-surface-700/50">
        {notifications.map((notification) => (
          <div key={notification.name} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-surface-700">
                <notification.icon className="w-5 h-5 text-surface-400" />
              </div>
              <div>
                <h3 className="font-medium text-white">{notification.name}</h3>
                <p className="text-sm text-surface-400">{notification.description}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={notification.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}



