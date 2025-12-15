'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

// Try to import SidebarTrigger, but handle gracefully if not available
let SidebarTrigger: any = null

try {
  const sidebarModule = require('@/components/ui/sidebar')
  SidebarTrigger = sidebarModule.SidebarTrigger
} catch (e) {
  // Sidebar components not available (old sidebar mode)
}

// Safe wrapper for SidebarTrigger that handles errors
function SafeSidebarTrigger({ className }: { className?: string }) {
  if (!SidebarTrigger) return null
  
  try {
    return <SidebarTrigger className={className} />
  } catch (e) {
    // Not in SidebarProvider context (old sidebar mode)
    return null
  }
}

interface HeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  extraAction?: ReactNode
}

export function Header({ title, subtitle, action, extraAction }: HeaderProps) {
  const hasSidebarTrigger = SidebarTrigger !== null
  
  return (
    <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl">
      <div className="px-6 py-3 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          {hasSidebarTrigger && (
            <>
              <SafeSidebarTrigger className="h-8 w-8" />
              <div className="h-6 w-px bg-surface-700" />
            </>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-surface-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Extra Action (e.g., Sync button) */}
          {extraAction}

          {/* Action Button */}
          {action && (
            action.href ? (
              <Link href={action.href} className="btn-primary">
                <Plus className="w-4 h-4" />
                {action.label}
              </Link>
            ) : (
              <button onClick={action.onClick} className="btn-primary">
                <Plus className="w-4 h-4" />
                {action.label}
              </button>
            )
          )}
        </div>
      </div>
    </header>
  )
}

