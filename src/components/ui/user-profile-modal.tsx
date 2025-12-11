'use client'

import { X, User, Mail, Briefcase, Users, UserCog } from 'lucide-react'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  name: string | null
  email: string | null
  image: string | null
  jobTitle: string | null
  team: string | null
  manager: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface UserProfileModalProps {
  user: UserProfile
  isOpen: boolean
  onClose: () => void
}

export function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
  // Prevent body scroll when modal is open
  useScrollLock(isOpen)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-surface-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">User Profile</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Photo */}
          <div className="flex justify-center">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || 'User'}
                className="w-24 h-24 rounded-full object-cover border-2 border-surface-600"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-brand-500/20 flex items-center justify-center border-2 border-surface-600">
                <User className="w-12 h-12 text-brand-400" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="space-y-4">
            {/* Name */}
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-surface-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-surface-500 mb-1">Name</div>
                <div className="text-sm font-medium text-white">
                  {user.name || 'Not set'}
                </div>
              </div>
            </div>

            {/* Email */}
            {user.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-surface-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-500 mb-1">Email</div>
                  <div className="text-sm text-surface-300 break-all">
                    {user.email}
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            {user.jobTitle && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-surface-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-500 mb-1">Title</div>
                  <div className="text-sm text-surface-300">
                    {user.jobTitle}
                  </div>
                </div>
              </div>
            )}

            {/* Team */}
            {user.team && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-surface-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-500 mb-1">Team</div>
                  <div className="text-sm text-surface-300">
                    {user.team}
                  </div>
                </div>
              </div>
            )}

            {/* Manager */}
            {user.manager && (
              <div className="flex items-start gap-3">
                <UserCog className="w-5 h-5 text-surface-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-surface-500 mb-1">Manager</div>
                  <div className="text-sm text-surface-300">
                    {user.manager.name || user.manager.email || 'Unknown'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-surface-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-surface-700 hover:bg-surface-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
