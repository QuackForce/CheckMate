'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { X, RefreshCw } from 'lucide-react'

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
    // Forceful logout (clears NextAuth/Auth.js + emergency cookies + DB session)
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch (error) {
      console.error('Error clearing sessions:', error)
    }
    // Hard redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
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
          // Forceful logout
          fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(console.error)
          if (typeof window !== 'undefined') {
            window.location.href = '/login?reason=timeout'
          }
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

  // Format time for display (e.g., "2:10 minutes")
  const formatTimeDisplay = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')} minutes`
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }

  // Handle close (same as stay signed in)
  const handleClose = () => {
    handleStaySignedIn()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 text-surface-400 hover:text-surface-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Main message */}
          <h2 className="text-2xl font-bold text-white mb-4 pr-8">
            You will be signed out due to inactivity
          </h2>

          {/* Time remaining */}
          <p className="text-base text-surface-300 mb-8">
            Time remaining: <span className="text-brand-400 font-medium">{formatTimeDisplay(timeRemaining)}</span>
          </p>

          {/* Action button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleStaySignedIn}
              disabled={isRefreshing}
              className="btn-primary px-6 py-2.5 flex items-center gap-2"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                'Keep me signed in'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
