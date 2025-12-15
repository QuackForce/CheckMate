'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Calendar,
  Users,
  Settings,
  MoreVertical,
  Boxes,
  Shield,
  Link2,
  FileText,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasPermission, hasAnyPermission, type PermissionKey, type Role } from '@/lib/permissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BottomNavProps {
  user: {
    role: string
  }
  stats?: {
    overdueCount: number
    totalChecks: number
  }
}

type NavItem =
  | { name: string; href: string; icon: any; permission: PermissionKey }
  | { name: string; href: string; icon: any; permissions: PermissionKey[] }

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { name: 'Clients', href: '/clients', icon: Building2, permissions: ['clients:view_all', 'clients:view_own'] },
  { name: 'Checks', href: '/checks', icon: ClipboardCheck, permissions: ['checks:view_all', 'checks:view_own'] },
  { name: 'Schedule', href: '/schedule', icon: Calendar, permission: 'schedule:view' },
  { name: 'Users', href: '/team', icon: Users, permission: 'team:view' },
]

const settingsSubItems = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Systems', href: '/settings/systems', icon: Boxes },
  { name: 'Frameworks', href: '/settings/frameworks', icon: Shield },
  { name: 'Teams', href: '/settings/teams', icon: Users },
  { name: 'Integrations', href: '/settings/integrations', icon: Link2 },
  { name: 'Templates', href: '/settings/templates', icon: FileText },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell },
]

export function BottomNav({ user, stats }: BottomNavProps) {
  const pathname = usePathname()
  const userRole = user.role as Role

  const filteredNavigation = navigation.filter((item) =>
    'permission' in item
      ? hasPermission(userRole, item.permission)
      : hasAnyPermission(userRole, item.permissions)
  )

  // Check if user has settings access
  const hasSettingsAccess = hasPermission(userRole, 'settings:view')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface-900/95 backdrop-blur-xl border-t border-surface-800 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const isChecksLink = item.href === '/checks'
          const hasOverdue = isChecksLink && stats?.overdueCount !== undefined && stats.overdueCount > 0
          const hasTotal = isChecksLink && stats?.totalChecks !== undefined && stats.totalChecks > 0
          const showBadge = hasOverdue || (hasTotal && !hasOverdue)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 px-2 transition-colors',
                isActive
                  ? 'text-brand-400'
                  : 'text-surface-400'
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {showBadge && (
                  <span className={cn(
                    'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium',
                    hasOverdue
                      ? 'bg-red-500 text-white'
                      : 'bg-surface-700 text-surface-300'
                  )}>
                    {hasOverdue ? stats.overdueCount : stats.totalChecks}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium truncate w-full text-center',
                isActive && 'text-brand-400'
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}

        {/* Settings Menu */}
        {hasSettingsAccess && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-0 px-2 transition-colors',
                  pathname.startsWith('/settings')
                    ? 'text-brand-400'
                    : 'text-surface-400'
                )}
              >
                <MoreVertical className="w-5 h-5" />
                <span className={cn(
                  'text-[10px] font-medium',
                  pathname.startsWith('/settings') && 'text-brand-400'
                )}>
                  More
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="mb-2 w-48">
              {settingsSubItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2',
                        isActive && 'bg-brand-500/10 text-brand-400'
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}

