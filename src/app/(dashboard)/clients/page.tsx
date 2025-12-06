import { Header } from '@/components/layout/header'
import { ClientsTableWrapper } from '@/components/clients/clients-table-wrapper'
import { ClientsFilters } from '@/components/clients/clients-filters'
import { db } from '@/lib/db'
import { RefreshButton } from '@/components/clients/refresh-button'

export const dynamic = 'force-dynamic'

async function getClientStats() {
  const [total, active, onboarding, inactive] = await Promise.all([
    db.client.count(),
    db.client.count({ where: { status: 'ACTIVE' } }),
    db.client.count({ where: { status: 'ONBOARDING' } }),
    db.client.count({ where: { status: 'INACTIVE' } }),
  ])
  
  return { total, active, onboarding, inactive }
}

export default async function ClientsPage() {
  const stats = await getClientStats()

  return (
    <>
      <Header 
        title="Clients"
        subtitle={`${stats.active} active of ${stats.total} total clients`}
        action={{ label: 'Add Client', href: '/clients/new' }}
        extraAction={<RefreshButton />}
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <p className="text-sm text-surface-400">Total Clients</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-surface-400">Active</p>
            <p className="text-2xl font-bold text-brand-400">{stats.active}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-surface-400">Onboarding</p>
            <p className="text-2xl font-bold text-blue-400">{stats.onboarding}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-surface-400">Inactive</p>
            <p className="text-2xl font-bold text-surface-500">{stats.inactive}</p>
          </div>
        </div>
        
        <ClientsFilters />
        <ClientsTableWrapper />
      </div>
    </>
  )
}
