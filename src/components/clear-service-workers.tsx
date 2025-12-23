'use client'

import { useEffect } from 'react'

export function ClearServiceWorkers() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then((success) => {
            if (success) {
              console.log('Service worker unregistered:', registration.scope)
            }
          })
        })
      })
    }

    // Clear all caches
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName).then((success) => {
            if (success) {
              console.log('Cache deleted:', cacheName)
            }
          })
        })
      })
    }
  }, [])

  return null
}

