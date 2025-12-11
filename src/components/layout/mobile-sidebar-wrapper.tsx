'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Menu } from 'lucide-react'

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-surface-950">
      <Sidebar
        user={user}
        stats={stats}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Menu Button */}
        <div className="lg:hidden sticky top-0 z-30 bg-surface-950/80 backdrop-blur-xl border-b border-surface-800">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-surface-400" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-lg shadow-brand-500/25 overflow-hidden">
                <img
                  src="/jonesit.jpg"
                  alt="Jones IT"
                  className="w-7 h-7 rounded-full object-cover"
                />
              </div>
              <span className="font-semibold text-white">CheckMate</span>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
