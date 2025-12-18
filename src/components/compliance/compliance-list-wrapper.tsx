'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Building2,
  Users,
  FileText,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { SearchInput } from '@/components/ui/search-input'
import { hasPermission } from '@/lib/permissions'

interface ComplianceAudit {
  id: string
  framework: string
  auditType: string
  lastAuditDate: string
  nextAuditDue: string
  status: string
  auditor?: string | null
  Client: { id: string; name: string }
}

interface AccessReview {
  id: string
  framework?: string | null
  reviewDate: string
  dueDate: string
  status: string
  Client: { id: string; name: string }
  AssignedTo?: { id: string; name: string | null; email: string | null } | null
}

interface ComplianceListWrapperProps {
  activeType: 'audits' | 'reviews'
  myClientsOnly: boolean
  onMyClientsToggle: (value: boolean) => void
}

export function ComplianceListWrapper({ activeType, myClientsOnly, onMyClientsToggle }: ComplianceListWrapperProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canViewAll = hasPermission(userRole, 'clients:view_all')
  const userId = session?.user?.id

  const [audits, setAudits] = useState<ComplianceAudit[]>([])
  const [reviews, setReviews] = useState<AccessReview[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'overdue' | 'completed' | 'all'>('active')

  // Notify parent component when filter changes
  useEffect(() => {
    const event = new CustomEvent('compliance-filter-change', { detail: myClientsOnly })
    window.dispatchEvent(event)
  }, [myClientsOnly])

  useEffect(() => {
    fetchData()
  }, [myClientsOnly, userId, canViewAll, activeType])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (canViewAll && myClientsOnly) {
        params.append('assignee', 'me')
      } else if (!canViewAll) {
        params.append('assignee', 'me')
      }

      const [auditsRes, reviewsRes] = await Promise.all([
        fetch(`/api/compliance/audits?${params}`),
        fetch(`/api/compliance/access-reviews?${params}`),
      ])

      if (auditsRes.ok) {
        const auditsData = await auditsRes.json()
        setAudits(auditsData)
      }

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json()
        setReviews(reviewsData)
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAuditStatusInfo = (audit: ComplianceAudit) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(audit.nextAuditDue)
    dueDate.setHours(0, 0, 0, 0)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (audit.status === 'COMPLETED') {
      return { label: 'Completed', color: 'text-brand-400', bg: 'bg-brand-500/20', icon: CheckCircle2, isOverdue: false }
    }
    if (audit.status === 'IN_PROGRESS') {
      return { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Clock, isOverdue: false }
    }
    if (daysUntilDue < 0) {
      return { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle, isOverdue: true }
    }
    if (daysUntilDue <= 30) {
      return { label: `Due in ${daysUntilDue} days`, color: 'text-amber-400', bg: 'bg-amber-500/20', icon: AlertTriangle, isOverdue: false }
    }
    return { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Calendar, isOverdue: false }
  }

  const getReviewStatusInfo = (review: AccessReview) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(review.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (review.status === 'COMPLETED') {
      return { label: 'Completed', color: 'text-brand-400', bg: 'bg-brand-500/20', icon: CheckCircle2, isOverdue: false }
    }
    if (review.status === 'IN_PROGRESS') {
      return { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Clock, isOverdue: false }
    }
    if (daysUntilDue < 0) {
      return { label: 'Overdue', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle, isOverdue: true }
    }
    if (daysUntilDue <= 14) {
      return { label: `Due in ${daysUntilDue} days`, color: 'text-amber-400', bg: 'bg-amber-500/20', icon: AlertTriangle, isOverdue: false }
    }
    return { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Calendar, isOverdue: false }
  }

  // Filter by type first (audits or reviews)
  type ComplianceItem = 
    | { type: 'audit'; data: ComplianceAudit; statusInfo: ReturnType<typeof getAuditStatusInfo> }
    | { type: 'review'; data: AccessReview; statusInfo: ReturnType<typeof getReviewStatusInfo> }

  const typeFilteredItems: ComplianceItem[] = activeType === 'audits'
    ? audits.map(audit => ({ type: 'audit' as const, data: audit, statusInfo: getAuditStatusInfo(audit) }))
    : reviews.map(review => ({ type: 'review' as const, data: review, statusInfo: getReviewStatusInfo(review) }))

  // Filter by "My Clients" - already filtered by API, so no additional filtering needed
  let filteredItems: ComplianceItem[] = typeFilteredItems

  // Filter by search
  if (search) {
    filteredItems = filteredItems.filter(item => {
      const clientName = item.data.Client.name.toLowerCase()
      const framework = item.type === 'audit' 
        ? item.data.framework.toLowerCase()
        : (item.data.framework || '').toLowerCase()
      return clientName.includes(search.toLowerCase()) || framework.includes(search.toLowerCase())
    })
  }

  // Filter by tab
  let tabFilteredItems: ComplianceItem[] = filteredItems
  if (activeTab === 'overdue') {
    tabFilteredItems = filteredItems.filter(item => item.statusInfo.isOverdue)
  } else if (activeTab === 'completed') {
    tabFilteredItems = filteredItems.filter(item => 
      item.data.status === 'COMPLETED'
    )
  } else if (activeTab === 'active') {
    tabFilteredItems = filteredItems.filter(item => 
      item.data.status !== 'COMPLETED' && !item.statusInfo.isOverdue
    )
  }
  // 'all' shows everything

  const total = tabFilteredItems.length

  const tabs = [
    { id: 'active' as const, label: 'Active', count: activeTab === 'active' ? total : undefined },
    { id: 'overdue' as const, label: 'Overdue', count: activeTab === 'overdue' ? total : undefined },
    { id: 'completed' as const, label: 'Completed', count: activeTab === 'completed' ? total : undefined },
    ...(canViewAll ? [{ id: 'all' as const, label: 'All', count: activeTab === 'all' ? total : undefined }] : []),
  ]

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-surface-500 mx-auto mb-4" />
        <p className="text-surface-400">Loading compliance data...</p>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Status Tabs */}
      <div className="border-b border-surface-700/50">
        <div className="flex items-center gap-1 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-400 hover:text-surface-200'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs',
                  activeTab === tab.id
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'bg-surface-600 text-surface-400'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by client name or framework..."
            className="flex-1 min-w-[280px] max-w-md"
          />
          
          {canViewAll && (
            <button
              onClick={() => onMyClientsToggle(!myClientsOnly)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                myClientsOnly
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700 hover:bg-surface-700'
              )}
            >
              <Users className="w-4 h-4" />
              My Clients
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {tabFilteredItems.length === 0 ? (
          <div className="text-center py-12">
            {activeType === 'audits' ? (
              <Shield className="w-12 h-12 text-surface-600 mx-auto mb-4" />
            ) : (
              <FileText className="w-12 h-12 text-surface-600 mx-auto mb-4" />
            )}
            <p className="text-surface-400 mb-2">
              {activeTab === 'overdue' && `No overdue ${activeType === 'audits' ? 'audits' : 'access reviews'}`}
              {activeTab === 'completed' && `No completed ${activeType === 'audits' ? 'audits' : 'access reviews'}`}
              {activeTab === 'active' && `No active ${activeType === 'audits' ? 'audits' : 'access reviews'}`}
              {activeTab === 'all' && `No ${activeType === 'audits' ? 'audits' : 'access reviews'}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tabFilteredItems.map((item) => {
              const StatusIcon = item.statusInfo.icon
              const href = item.type === 'audit'
                ? `/clients/${item.data.Client.id}#compliance`
                : `/clients/${item.data.Client.id}/access-reviews/${item.data.id}`

              return (
                <Link
                  key={`${item.type}-${item.data.id}`}
                  href={href}
                  className="block p-4 bg-surface-800 rounded-lg border border-surface-700 hover:border-surface-600 hover:bg-surface-800/80 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-4 h-4 text-surface-400" />
                        <span className="font-medium text-white">{item.data.Client.name}</span>
                        <Shield className={cn(
                          'w-4 h-4',
                          item.type === 'audit' ? 'text-blue-400' : 'text-violet-400'
                        )} />
                        <span className="text-sm text-surface-400">
                          {item.type === 'audit' 
                            ? `${item.data.framework} - ${item.data.auditType}`
                            : formatDate(new Date(item.data.reviewDate))
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-surface-400">
                        {item.type === 'audit' ? (
                          <>
                            <span>Next Due: {formatDate(new Date(item.data.nextAuditDue))}</span>
                            {item.data.auditor && <span>Auditor: {item.data.auditor}</span>}
                          </>
                        ) : (
                          <>
                            <span>Due: {formatDate(new Date(item.data.dueDate))}</span>
                            {item.data.AssignedTo && (
                              <span>Assigned: {item.data.AssignedTo.name || item.data.AssignedTo.email}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2', item.statusInfo.bg, item.statusInfo.color)}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {item.statusInfo.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

