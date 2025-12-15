'use client'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

interface MobileSidebarWrapperProps {
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
  children: React.ReactNode
}

export function MobileSidebarWrapper({ user, stats, children }: MobileSidebarWrapperProps) {
  return (
    <SidebarProvider className="bg-surface-950">
      <AppSidebar user={user} stats={stats} />
      <main className="flex-1 flex flex-col min-h-screen w-full transition-[width] duration-200 ease-linear bg-surface-950">
        {children}
      </main>
    </SidebarProvider>
  )
}

