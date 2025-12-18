'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { User, Link2 } from 'lucide-react'

const profileTabs = [
  { name: 'Preferences', href: '/profile', icon: User, description: 'Notification settings' },
  { name: 'My Integrations', href: '/profile/integrations', icon: Link2, description: 'Personal integrations' },
]

export function ProfileNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 border-b border-surface-700/50 pb-4">
      {profileTabs.map((tab) => {
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








