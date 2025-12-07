'use client'

import { SessionProvider } from 'next-auth/react'
import { SessionTimeoutWarning } from './session-timeout-warning'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <SessionTimeoutWarning />
    </SessionProvider>
  )
}



