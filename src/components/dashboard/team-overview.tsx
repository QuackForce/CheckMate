'use client'

import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  completed: number
  total: number
  overdue: number
  image: string | null
}

interface TeamOverviewProps {
  team: TeamMember[]
}

export function TeamOverview({ team }: TeamOverviewProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
        <h2 className="font-semibold text-white">Team Progress</h2>
        <Link 
          href="/team" 
          className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="p-3 space-y-2">
        {team.slice(0, 5).map((member) => {
          const progress = (member.completed / member.total) * 100
          const isComplete = member.completed === member.total

          return (
            <div
              key={member.id}
              className="p-2 rounded-lg hover:bg-surface-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                {/* Avatar */}
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-sm font-medium text-surface-300">
                    {member.name.charAt(0)}
                  </div>
                )}

                {/* Name & stats */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {member.name}
                    </span>
                    {isComplete && (
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  <span className="text-xs text-surface-500">
                    {member.completed}/{member.total} complete
                    {member.overdue > 0 && (
                      <span className="text-red-400 ml-2">
                        {member.overdue} overdue
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    isComplete ? 'bg-brand-500' : 'bg-brand-500/70'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

