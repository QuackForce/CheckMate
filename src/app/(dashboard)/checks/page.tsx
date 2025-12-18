import { Header } from '@/components/layout/header'
import { ChecksPageContent } from '@/components/checks/checks-page-content'

export const dynamic = 'force-dynamic'

export default function ChecksPage() {
  return (
    <>
      <Header 
        title="Infrastructure Checks"
        action={{ label: 'New Check', href: '/checks/new' }}
      />

      <ChecksPageContent />
    </>
  )
}

