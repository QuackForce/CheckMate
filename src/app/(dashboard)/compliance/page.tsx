import { Header } from '@/components/layout/header'
import { CompliancePageContent } from '@/components/compliance/compliance-page-content'

export const dynamic = 'force-dynamic'

export default function CompliancePage() {
  return (
    <>
      <Header 
        title="Compliance"
        action={{ label: 'Schedule Review', href: '/compliance/reviews/new' }}
      />

      <CompliancePageContent />
    </>
  )
}

