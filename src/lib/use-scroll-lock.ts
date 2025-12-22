import { useEffect } from 'react'

/**
 * Hook to prevent body scrolling when a modal is open
 * Usage: useScrollLock(isModalOpen)
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      // Use html overflow instead of body position fixed to avoid layout shifts
      // This prevents sidebar resize issues
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.documentElement.style.overflow = ''
    }

    return () => {
      // Cleanup on unmount
      document.documentElement.style.overflow = ''
    }
  }, [isLocked])
}
