import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'CheckMate',
  description: 'Infrastructure monitoring and compliance checks for IT managed services',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CheckMate',
  },
  icons: {
    icon: '/jonesit_transparent.png',
    shortcut: '/jonesit_transparent.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#22c55e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster 
            theme="dark" 
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgb(30 30 35)',
                border: '1px solid rgb(50 50 60)',
                color: '#fff',
              },
            }}
          />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}

