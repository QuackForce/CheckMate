'use client'

import Link from 'next/link'
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Download,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { cn, formatDate, formatTime } from '@/lib/utils'

interface Report {
  id: string
  client: { id: string; name: string }
  completedBy: { name: string }
  completedAt: Date
  duration: number
  findings: { allGood: number; issues: number }
  slackPosted: boolean
}

interface ReportsListProps {
  reports: Report[]
}

export function ReportsList({ reports }: ReportsListProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
        <h2 className="font-semibold text-white">Recent Reports</h2>
        <button className="btn-ghost text-sm">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-brand-400" />
          </div>
          <p className="text-surface-300 font-medium">No reports yet</p>
          <p className="text-sm text-surface-500 mt-1">Completed infrastructure checks will appear here</p>
        </div>
      ) : (
        <div className="divide-y divide-surface-700/50">
          {reports.map((report, index) => (
          <div
            key={report.id}
            className="p-4 hover:bg-surface-800/30 transition-colors animate-slide-up"
            style={{ animationDelay: `${index * 30}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-brand-400" />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <Link
                    href={`/clients/${report.client.id}`}
                    className="font-semibold text-white hover:text-brand-400 transition-colors"
                  >
                    {report.client.name}
                  </Link>
                  <span className="badge bg-brand-500/20 text-brand-400 border-brand-500/30">
                    Completed
                  </span>
                  {report.slackPosted && (
                    <span className="flex items-center gap-1 text-xs text-surface-400">
                      <MessageSquare className="w-3 h-3" />
                      Posted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-surface-400">
                  <span>{formatDate(report.completedAt)}</span>
                  <span>•</span>
                  <span>{report.completedBy.name}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(report.duration)}
                  </span>
                </div>
              </div>

              {/* Findings summary */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-brand-400" />
                    <span className="text-surface-300">{report.findings.allGood}</span>
                  </div>
                  {report.findings.issues > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                      <span className="text-surface-300">{report.findings.issues}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <Link
                  href={`/checks/${report.id}`}
                  className="btn-secondary text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Report
                </Link>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {reports.length > 0 && (
        <div className="px-4 py-3 border-t border-surface-700/50">
          <p className="text-sm text-surface-400 text-center">
            Showing <span className="font-medium text-white">{reports.length}</span> report{reports.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

