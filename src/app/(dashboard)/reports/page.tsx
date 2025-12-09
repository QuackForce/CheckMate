import { Header } from '@/components/layout/header'
import { ReportsList } from '@/components/reports/reports-list'
import { ReportsStats } from '@/components/reports/reports-stats'
import { db } from '@/lib/db'

async function getReportsData() {
  // Get all completed checks
  const completedChecks = await db.infraCheck.findMany({
    where: {
      status: 'COMPLETED',
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      completedBy: {
        select: { name: true },
      },
      categoryResults: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
  })

  // Calculate findings for each check
  const reports = completedChecks.map((check) => {
    let allGood = 0
    let issues = 0

    check.categoryResults.forEach((category) => {
      const allItemsChecked = category.items.every((item) => item.checked)
      const hasNotes = category.items.some((item) => item.notes && item.notes.trim()) || 
                      (category.notes && category.notes.trim())
      const categoryHasIssues = category.status === 'issues_found' || 
                                !allItemsChecked || 
                                hasNotes

      if (categoryHasIssues) {
        issues++
      } else {
        allGood++
      }
    })

    return {
      id: check.id,
      client: { id: check.client.id, name: check.client.name },
      completedBy: { 
        name: check.completedBy?.name || 'Unknown' 
      },
      completedAt: check.completedAt ? new Date(check.completedAt) : new Date(check.updatedAt),
      duration: check.totalTimeSeconds,
      findings: { allGood, issues },
      slackPosted: !!check.slackMessageTs,
    }
  })

  // Calculate stats
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const thisMonthReports = reports.filter(
    (r) => r.completedAt >= startOfMonth
  )

  const totalReports = reports.length
  const totalThisMonth = thisMonthReports.length
  
  const totalDuration = reports.reduce((sum, r) => sum + r.duration, 0)
  const avgDuration = totalReports > 0 ? Math.round(totalDuration / totalReports) : 0
  
  const cleanReports = reports.filter((r) => r.findings.issues === 0).length
  const cleanPercentage = totalReports > 0 
    ? Math.round((cleanReports / totalReports) * 100) 
    : 0
  
  const totalIssues = reports.reduce((sum, r) => sum + r.findings.issues, 0)

  return {
    reports,
    stats: {
      totalReports: totalThisMonth,
      avgDuration,
      cleanPercentage,
      totalIssues,
    },
  }
}

export default async function ReportsPage() {
  const { reports, stats } = await getReportsData()

  return (
    <>
      <Header 
        title="Reports"
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <ReportsStats stats={stats} />
        <ReportsList reports={reports} />
      </div>
    </>
  )
}

