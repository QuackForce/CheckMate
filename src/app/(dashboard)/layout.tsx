import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MobileSidebarWrapper } from '@/components/layout/mobile-sidebar-wrapper'
import { db } from '@/lib/db'

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
  // Always require authentication
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  // Ensure user has a role, default to CONSULTANT if missing
  const userRole = session.user.role || 'CONSULTANT'
  
  const user = {
    name: session.user.name || 'User',
    email: session.user.email || '',
    image: session.user.image || null,
    role: userRole as 'IT_ENGINEER' | 'ADMIN' | 'VIEWER' | 'IT_MANAGER' | 'CONSULTANT',
  }

  const checkStats = await getCheckStats()

  return (
    <MobileSidebarWrapper user={user} stats={checkStats}>
      {children}
    </MobileSidebarWrapper>
  )
}

