'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState, useEffect, useRef, Fragment } from 'react'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Calendar,
  Users,
  Settings,
  FileText,
  LogOut,
  User,
  Menu,
  X,
} from 'lucide-react'
import {
  hasPermission,
  hasAnyPermission,
  hasAnySettingsAccess,
  roleDisplayNames,
  type Role,
  type PermissionKey,
} from '@/lib/permissions'

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
  }
  stats?: {
    overdueCount: number
    totalChecks: number
  }
  isOpen?: boolean
  onClose?: () => void
}

type NavItem =
  | { name: string; href: string; icon: any; permission: PermissionKey }
  | { name: string; href: string; icon: any; permissions: PermissionKey[] }

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
  { name: 'Clients', href: '/clients', icon: Building2, permissions: ['clients:view_all', 'clients:view_own'] },
  { name: 'Checks', href: '/checks', icon: ClipboardCheck, permissions: ['checks:view_all', 'checks:view_own'] },
  { name: 'Schedule', href: '/schedule', icon: Calendar, permission: 'schedule:view' },
  { name: 'Team', href: '/team', icon: Users, permission: 'team:view' },
  // Temporarily removed - can be restored later
  // { name: 'Org Chart', href: '/org-chart', icon: Users, permission: 'org_chart:view' },
  // { name: 'Reports', href: '/reports', icon: FileText, permission: 'reports:view' },
]

// Keep for potential future admin-only pages
const adminNavigation: { name: string; href: string; icon: any }[] = []

const settingsNavigation: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'settings:view' },
]

export function Sidebar({ user, stats, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const userRole = user.role as Role
  const isAdmin = userRole === 'ADMIN'
  const showSettings = hasAnySettingsAccess(userRole)

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (onClose && pathname) {
      onClose()
    }
  }, [pathname, onClose])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false)
      }
    }

    if (isAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isAccountOpen])

  return (
    <Fragment>
      {/* Mobile Overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'bg-surface-900/50 border-r border-surface-800 flex flex-col h-screen sticky top-0 z-50 transition-transform duration-300',
          'w-64 min-w-[16rem] max-w-[16rem]',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'fixed lg:sticky'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-4 h-[84px] flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-brand-500/25 overflow-hidden">
              <img
                src="/jonesit.jpg"
                alt="Jones IT"
                className="w-9 h-9 rounded-full object-cover"
              />
            </div>
            <div>
              <span className="font-semibold text-white">CheckMate</span>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-surface-400" />
            </button>
          )}
        </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="mb-4">
          <p className="px-3 text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
            Main
          </p>
          {navigation
            .filter((item) =>
              'permission' in item
                ? hasPermission(userRole, item.permission)
                : hasAnyPermission(userRole, item.permissions)
            )
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const isChecksLink = item.href === '/checks'
              const showOverdueBadge = isChecksLink && stats?.overdueCount && stats.overdueCount > 0
              const showTotalCount = isChecksLink && stats?.totalChecks !== undefined

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 min-w-0',
                    isActive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.name}</span>
                  {showOverdueBadge ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded-full">
                      {stats.overdueCount}
                    </span>
                  ) : showTotalCount ? (
                    <span className="px-2 py-0.5 text-xs font-medium bg-surface-700 text-surface-400 rounded-full">
                      {stats.totalChecks}
                    </span>
                  ) : null}
                </Link>
              )
            })}
        </div>

        {isAdmin && adminNavigation.length > 0 && (
          <div>
            <p className="px-3 text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              Admin
            </p>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{item.name}</span>
                </Link>
              )
            })}
          </div>
        )}

        {showSettings && (
          <div>
            <p className="px-3 text-xs font-medium text-surface-500 uppercase tracking-wider mb-2">
              Configure
            </p>
            {settingsNavigation
              .filter((item) => ('permission' in item ? hasPermission(userRole, item.permission) : true))
              .map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-brand-500/10 text-brand-400'
                        : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </Link>
                )
              })}
          </div>
        )}
      </nav>

      {/* User Profile / Account Menu */}
      <div className="p-4">
        <div className="relative" ref={accountMenuRef}>
          <button
            onClick={() => setIsAccountOpen((open) => !open)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-surface-800 transition-colors"
          >
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || 'User'}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-medium">
                {user.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-surface-500 truncate">
                {roleDisplayNames[userRole] || user.role}
              </p>
            </div>
          </button>

          {/* Popout menu */}
          {isAccountOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-surface-900 border border-surface-700 shadow-lg overflow-hidden">
              <Link
                href="/profile"
                onClick={() => setIsAccountOpen(false)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                  pathname.startsWith('/profile')
                    ? 'text-brand-400 bg-brand-500/10'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800'
                )}
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </Link>
              <div className="border-t border-surface-700 my-1" />
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
    </Fragment>
  )
}

