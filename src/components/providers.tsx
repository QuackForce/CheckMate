'use client'

import { SessionProvider } from 'next-auth/react'
import { SessionTimeoutWarning } from './session-timeout-warning'
import { ClearServiceWorkers } from './clear-service-workers'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ClearServiceWorkers />
      {children}
      <SessionTimeoutWarning />
    </SessionProvider>
  )
}



