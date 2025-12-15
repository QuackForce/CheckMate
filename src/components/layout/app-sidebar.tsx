'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  ClipboardCheck,
  Calendar,
  Users,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Boxes,
  Link2,
  FileText,
  Bell,
  Shield,
} from 'lucide-react'
import {
  hasPermission,
  hasAnyPermission,
  hasAnySettingsAccess,
  roleDisplayNames,
  type Role,
  type PermissionKey,
} from '@/lib/permissions'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/ui/sidebar'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface AppSidebarProps {
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

const settingsNavigation: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'settings:view' },
]

const settingsSubItems = [
  { name: 'Systems', href: '/settings/systems', icon: Boxes },
  { name: 'Frameworks', href: '/settings/frameworks', icon: Shield },
  { name: 'Teams', href: '/settings/teams', icon: Users },
  { name: 'Integrations', href: '/settings/integrations', icon: Link2 },
  { name: 'Templates', href: '/settings/templates', icon: FileText },
  { name: 'Notifications', href: '/settings/notifications', icon: Bell },
]

export function AppSidebar({ user, stats }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const userRole = user.role as Role
  const isAdmin = userRole === 'ADMIN'
  const showSettings = hasAnySettingsAccess(userRole)
  const isCollapsed = state === 'collapsed'

  const filteredNavigation = navigation.filter((item) =>
    'permission' in item
      ? hasPermission(userRole, item.permission)
      : hasAnyPermission(userRole, item.permissions)
  )

  const filteredSettings = settingsNavigation.filter((item) =>
    'permission' in item ? hasPermission(userRole, item.permission) : true
  )

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-white shadow-lg shadow-brand-500/25">
                  <img
                    src="/jonesit.jpg"
                    alt="Jones IT"
                    className="size-7 rounded-full object-cover"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">CheckMate</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                const isChecksLink = item.href === '/checks'
                const hasOverdue = isChecksLink && stats?.overdueCount !== undefined && stats.overdueCount > 0
                const hasTotal = isChecksLink && stats?.totalChecks !== undefined && stats.totalChecks > 0
                const showOverdueBadge = hasOverdue
                const showTotalCount = hasTotal && !hasOverdue

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                        {showOverdueBadge && stats?.overdueCount > 0 && (
                          <SidebarMenuBadge className="ml-auto bg-red-500/20 text-red-400">
                            {stats.overdueCount}
                          </SidebarMenuBadge>
                        )}
                        {showTotalCount && stats?.totalChecks > 0 && (
                          <SidebarMenuBadge className="ml-auto">
                            {stats.totalChecks}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showSettings && filteredSettings.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Configure</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredSettings.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const isSettingsOpen = pathname.startsWith('/settings')

                  // When collapsed, just navigate to settings; when expanded, use Collapsible
                  if (isCollapsed) {
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  }

                  return (
                    <SidebarMenuItem key={item.name}>
                      <Collapsible defaultOpen={isSettingsOpen}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={isActive} className="group">
                            <item.icon />
                            <span>{item.name}</span>
                            <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {settingsSubItems.map((subItem) => {
                              const isSubActive = pathname === subItem.href

                              return (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <SidebarMenuSubButton asChild isActive={isSubActive}>
                                    <Link href={subItem.href}>
                                      <subItem.icon />
                                      <span>{subItem.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || 'User'}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-400 font-medium">
                      {user.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name || 'User'}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {roleDisplayNames[userRole] || user.role}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--sidebar-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem
                  onClick={() => router.push('/profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
                    } catch (error) {
                      console.error('Error clearing sessions:', error)
                    }
                    if (typeof window !== 'undefined') {
                      window.location.href = '/login'
                    }
                  }}
                  className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

