import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { db } from '@/lib/db'

// Demo mode check (supports both naming conventions)
const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
const isDemoMode = !googleClientId || googleClientId === 'placeholder'

// Fallback user for when auth is not configured
const demoUser: {
  name: string
  email: string
  image: string | null
  role: string
} = {
  name: 'Guest User',
  email: 'guest@jonesit.com',
  image: null,
  role: 'IT_ENGINEER',
}

async function getCheckStats() {
  try {
    const [overdueCount, totalChecks] = await Promise.all([
      db.infraCheck.count({ where: { status: 'OVERDUE' } }),
      db.infraCheck.count(),
    ])
    return { overdueCount, totalChecks }
  } catch {
    return { overdueCount: 0, totalChecks: 0 }
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = demoUser

  // Try to get real session if not in demo mode
  if (!isDemoMode) {
    const session = await auth()
    if (session?.user) {
      user = {
        name: session.user.name || 'User',
        email: session.user.email || '',
        image: session.user.image || null,
        role: session.user.role as 'IT_ENGINEER' | 'ADMIN' | 'VIEWER',
      }
    } else {
      // No session and not in demo mode - redirect to login
      redirect('/login')
    }
  }

  const checkStats = await getCheckStats()

  return (
    <div className="flex min-h-screen bg-surface-950">
      <Sidebar 
        user={user}
        stats={checkStats}
      />
      <main className="flex-1 flex flex-col min-h-screen">
        {children}
      </main>
    </div>
  )
}

