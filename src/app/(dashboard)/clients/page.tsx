import { Header } from '@/components/layout/header'
import { ClientsTableWrapper } from '@/components/clients/clients-table-wrapper'
import { ClientsFilters } from '@/components/clients/clients-filters'
import { ClientsPageContent } from '@/components/clients/clients-page-content'

export const dynamic = 'force-dynamic'

export default function ClientsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header 
        title="Clients"
        action={{ label: 'Add Client', href: '/clients/new' }}
      />

      <div className="flex-1 overflow-y-auto">
        <ClientsPageContent />
      </div>
    </div>
  )
}
