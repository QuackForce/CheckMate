'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Clock, LogOut, RefreshCw } from 'lucide-react'

// Configuration
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000  // 8 hours
const WARNING_BEFORE = 30 * 60 * 1000       // 30 minutes warning

export function SessionTimeoutWarning() {
  const { data: session, status, update } = useSession()
  const [showWarning, setShowWarning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(WARNING_BEFORE)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const lastActivityRef = useRef(Date.now())
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clear all timers
  const clearAllTimers = () => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
      warningTimeoutRef.current = null
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  // Handle logout
  const handleLogout = async () => {
    clearAllTimers()
    setShowWarning(false)
    await signOut({ callbackUrl: '/login' })
  }

  // Handle stay signed in
  const handleStaySignedIn = async () => {
    setIsRefreshing(true)
    
    try {
      await update()
      clearAllTimers()
      setShowWarning(false)
      setTimeRemaining(WARNING_BEFORE)
      lastActivityRef.current = Date.now()
    } catch (error) {
      console.error('Failed to refresh session:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Start the countdown when warning is shown
  useEffect(() => {
    if (!showWarning) return

    setTimeRemaining(WARNING_BEFORE)
    
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1000
        
        if (newTime <= 0) {
          // Time's up - log out
          clearAllTimers()
          signOut({ callbackUrl: '/login?reason=timeout' })
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [showWarning])

  // Listen for test trigger and track activity
  useEffect(() => {
    if (status !== 'authenticated') return

    // Test trigger
    const handleTestTrigger = () => {
      setShowWarning(true)
    }
    
    // Activity tracker
    const handleActivity = () => {
      if (!showWarning) {
        lastActivityRef.current = Date.now()
      }
    }

    // Register test trigger
    window.addEventListener('trigger-session-warning', handleTestTrigger)
    
    // Register activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Expose test function globally (for development testing)
    ;(window as any).testSessionTimeout = () => {
      window.dispatchEvent(new CustomEvent('trigger-session-warning'))
    }

    return () => {
      window.removeEventListener('trigger-session-warning', handleTestTrigger)
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      delete (window as any).testSessionTimeout
    }
  }, [status, showWarning])

  // Schedule the actual warning (for production use)
  useEffect(() => {
    if (status !== 'authenticated') return

    const scheduleWarning = () => {
      clearAllTimers()
      
      const timeUntilWarning = SESSION_TIMEOUT - WARNING_BEFORE
      
      warningTimeoutRef.current = setTimeout(() => {
        const timeSinceActivity = Date.now() - lastActivityRef.current
        
        if (timeSinceActivity >= timeUntilWarning) {
          setShowWarning(true)
        } else {
          // User was active, reschedule
          scheduleWarning()
        }
      }, Math.min(timeUntilWarning, 60000)) // Check every minute or when timeout
    }

    scheduleWarning()

    return () => clearAllTimers()
  }, [status])

  // Don't render if not authenticated or warning not shown
  if (status !== 'authenticated' || !session || !showWarning) {
    return null
  }

  // Format time remaining
  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Session Expiring Soon</h2>
            <p className="text-sm text-zinc-400">Your session will expire due to inactivity</p>
          </div>
        </div>

        {/* Countdown */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-amber-400 mb-1">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-zinc-400">until automatic logout</p>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeRemaining / WARNING_BEFORE) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
          <button
            type="button"
            onClick={handleStaySignedIn}
            disabled={isRefreshing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Stay Signed In
          </button>
        </div>

        {/* User info */}
        <p className="text-xs text-zinc-500 text-center mt-4">
          Signed in as {session.user?.email}
        </p>
      </div>
    </div>
  )
}
