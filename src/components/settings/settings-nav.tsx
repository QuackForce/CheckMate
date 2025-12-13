'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Boxes, 
  Link2, 
  FileText, 
  Bell,
  Shield,
  Users,
} from 'lucide-react'

const settingsTabs = [
  { name: 'Systems', href: '/settings/systems', icon: Boxes, description: 'Manage check systems and items' },
  { name: 'Frameworks', href: '/settings/frameworks', icon: Shield, description: 'Compliance frameworks' },
  { name: 'Teams', href: '/settings/teams', icon: Users, description: 'Manage teams' },
  { name: 'Integrations', href: '/settings/integrations', icon: Link2, description: 'Org-wide integrations' },
  { name: 'Templates', href: '/settings/templates', icon: FileText, description: 'Check templates' },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell, description: 'Send reminders' },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 border-b border-surface-700/50 pb-4">
      {settingsTabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
              isActive
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30'
                : 'text-surface-400 hover:text-white hover:bg-surface-800 border border-transparent'
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.name}</span>
          </Link>
        )
      })}
    </div>
  )
}

