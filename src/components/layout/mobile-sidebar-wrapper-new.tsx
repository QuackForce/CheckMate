'use client'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { BottomNav } from './bottom-nav'

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
    overdueReviews: number
    totalReviews: number
  }
  children: React.ReactNode
}

export function MobileSidebarWrapper({ user, stats, children }: MobileSidebarWrapperProps) {
  return (
    <SidebarProvider className="bg-surface-950 overflow-x-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar user={user} stats={stats} />
      </div>
      <main className="flex-1 flex flex-col min-h-screen w-full transition-[width] duration-200 ease-linear bg-surface-950 md:pb-0 overflow-x-hidden" style={{ 
        paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
      }}>
        {children}
      </main>
      {/* Mobile Bottom Navigation - hidden on desktop */}
      <BottomNav user={user} stats={stats} />
    </SidebarProvider>
  )
}

