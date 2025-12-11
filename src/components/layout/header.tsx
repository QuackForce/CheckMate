'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'

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
  return (
    <header className="sticky top-0 z-40 bg-surface-950/80 backdrop-blur-xl">
      <div className="px-6 py-4 h-[84px] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-surface-400 mt-0.5">{subtitle}</p>
          )}
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
      <div className="border-b border-surface-800" />
    </header>
  )
}

