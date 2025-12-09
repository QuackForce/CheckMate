import { Header } from '@/components/layout/header'
import { ChecksListWrapper } from '@/components/checks/checks-list-wrapper'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getCheckStats() {
  try {
    const [total, overdue, inProgress, completed] = await Promise.all([
      db.infraCheck.count(),
      db.infraCheck.count({ where: { status: 'OVERDUE' } }),
      db.infraCheck.count({ where: { status: 'IN_PROGRESS' } }),
      db.infraCheck.count({ where: { status: 'COMPLETED' } }),
    ])
    return { total, overdue, inProgress, completed }
  } catch {
    return { total: 0, overdue: 0, inProgress: 0, completed: 0 }
  }
}

export default async function ChecksPage() {
  const stats = await getCheckStats()

  return (
    <>
      <Header 
        title="Infrastructure Checks"
        action={{ label: 'New Check', href: '/checks/new' }}
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Quick Stats */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-sm text-surface-400">Total Checks</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-surface-400">Overdue</p>
              <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-surface-400">In Progress</p>
              <p className="text-2xl font-bold text-amber-400">{stats.inProgress}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-surface-400">Completed</p>
              <p className="text-2xl font-bold text-brand-400">{stats.completed}</p>
            </div>
          </div>
        )}

        <ChecksListWrapper />
      </div>
    </>
  )
}

