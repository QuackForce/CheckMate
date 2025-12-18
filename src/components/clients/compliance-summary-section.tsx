'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Shield, 
  Calendar, 
  ExternalLink, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  FileText,
  User,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { hasPermission } from '@/lib/permissions'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'

interface ComplianceAudit {
  id: string
  framework: string
  auditType: string
  lastAuditDate: string
  auditPeriod: number
  nextAuditDue: string
  actualDate?: string | null
  status: string
  auditor?: string | null
  evidenceUrl?: string | null
  notes?: string | null
}

interface AccessReview {
  id: string
  framework?: string | null
  reviewDate: string
  dueDate: string
  status: string
  completedAt?: string | null
  evidenceUrl?: string | null
}

interface ComplianceSummarySectionProps {
  clientId: string
}

export function ComplianceSummarySection({ clientId }: ComplianceSummarySectionProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canManage = hasPermission(userRole, 'compliance:manage')

  const [audits, setAudits] = useState<ComplianceAudit[]>([])
  const [reviews, setReviews] = useState<AccessReview[]>([])
  const [loading, setLoading] = useState(true)
  const [frameworks, setFrameworks] = useState<Array<{ id: string; name: string }>>([])
  const [auditTypes, setAuditTypes] = useState<Array<{ id: string; name: string }>>([])
  
  // Audit edit state
  const [showAuditModal, setShowAuditModal] = useState(false)
  const [editingAudit, setEditingAudit] = useState<ComplianceAudit | null>(null)
  const [saving, setSaving] = useState(false)
  // Delete confirmation state
  const [auditToDelete, setAuditToDelete] = useState<ComplianceAudit | null>(null)
  
  // Section toggle state
  const [openSection, setOpenSection] = useState<string | null>('framework')
  
  // Form state
  const [framework, setFramework] = useState('')
  const [auditType, setAuditType] = useState('')
  const [lastAuditDate, setLastAuditDate] = useState('')
  const [auditPeriod, setAuditPeriod] = useState('12')
  const [nextAuditDue, setNextAuditDue] = useState('')
  const [auditor, setAuditor] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  useEffect(() => {
    fetchData()
    fetchFrameworks()
  }, [clientId])

  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/frameworks?activeOnly=true')
      if (res.ok) {
        const data = await res.json()
        setFrameworks(data.map((f: { id: string; name: string }) => ({
          id: f.id,
          name: f.name,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch frameworks:', error)
    }
  }

  const fetchAuditTypes = async (frameworkName: string) => {
    if (!frameworkName) {
      setAuditTypes([])
      return
    }
    
    try {
      const res = await fetch(`/api/audit-types?frameworkName=${encodeURIComponent(frameworkName)}&activeOnly=true`)
      if (res.ok) {
        const data = await res.json()
        setAuditTypes(data.map((at: { id: string; name: string }) => ({
          id: at.id,
          name: at.name,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch audit types:', error)
      setAuditTypes([])
    }
  }

  // Fetch audit types when framework changes
  useEffect(() => {
    if (framework) {
      fetchAuditTypes(framework)
      // Reset audit type when framework changes
      setAuditType('')
    } else {
      setAuditTypes([])
      setAuditType('')
    }
  }, [framework])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [auditsRes, reviewsRes] = await Promise.all([
        fetch(`/api/clients/${clientId}/compliance/audits`),
        fetch(`/api/clients/${clientId}/access-reviews`),
      ])

      if (auditsRes.ok) {
        const data = await auditsRes.json()
        setAudits(data)
      }

      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setReviews(data)
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateNextDue = (lastDate: string, period: number) => {
    const date = new Date(lastDate)
    date.setMonth(date.getMonth() + period)
    return date.toISOString().split('T')[0]
  }

  const handleLastAuditDateChange = (date: string) => {
    setLastAuditDate(date)
    if (date && auditPeriod) {
      const nextDue = calculateNextDue(date, parseInt(auditPeriod))
      setNextAuditDue(nextDue)
    }
  }

  const handleAuditPeriodChange = (period: string) => {
    setAuditPeriod(period)
    if (lastAuditDate && period) {
      const nextDue = calculateNextDue(lastAuditDate, parseInt(period))
      setNextAuditDue(nextDue)
    }
  }

  const resetAuditForm = () => {
    setFramework('')
    setAuditType('')
    setLastAuditDate('')
    setAuditPeriod('12')
    setNextAuditDue('')
    setAuditor('')
    setEvidenceUrl('')
    setEditingAudit(null)
    setOpenSection('framework') // Reset to framework section open
  }

  const openAddAuditModal = () => {
    resetAuditForm()
    setShowAuditModal(true)
  }

  const openEditAuditModal = async (audit: ComplianceAudit) => {
    setFramework(audit.framework)
    setLastAuditDate(new Date(audit.lastAuditDate).toISOString().split('T')[0])
    setAuditPeriod(audit.auditPeriod.toString())
    setNextAuditDue(new Date(audit.nextAuditDue).toISOString().split('T')[0])
    setAuditor(audit.auditor || '')
    setEvidenceUrl(audit.evidenceUrl || '')
    setEditingAudit(audit)
    
    // Fetch audit types for the framework first
    await fetchAuditTypes(audit.framework)
    
    // Set audit type after types are loaded
    setAuditType(audit.auditType)
    
    setShowAuditModal(true)
  }

  const handleAuditSubmit = async () => {
    if (!framework || !auditType || !lastAuditDate || !auditPeriod || !nextAuditDue) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const url = editingAudit
        ? `/api/clients/${clientId}/compliance/audits/${editingAudit.id}`
        : `/api/clients/${clientId}/compliance/audits`

      const method = editingAudit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework,
          auditType,
          lastAuditDate: new Date(lastAuditDate).toISOString(),
          auditPeriod: parseInt(auditPeriod),
          nextAuditDue: new Date(nextAuditDue).toISOString(),
          auditor: auditor || null,
          evidenceUrl: evidenceUrl || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save audit period')
      }

      toast.success(editingAudit ? 'Audit period updated' : 'Audit period added')
      setShowAuditModal(false)
      resetAuditForm()
      fetchData()
    } catch (error: any) {
      console.error('Error saving audit:', error)
      toast.error(error.message || 'Failed to save audit period')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAudit = async () => {
    if (!auditToDelete) return

    try {
      const res = await fetch(`/api/clients/${clientId}/compliance/audits/${auditToDelete.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete audit period')
      }

      toast.success('Audit period deleted')
      setAuditToDelete(null)
      fetchData()
    } catch (error: any) {
      console.error('Error deleting audit:', error)
      toast.error(error.message || 'Failed to delete audit period')
      setAuditToDelete(null)
    }
  }

  const getAuditStatusInfo = (audit: ComplianceAudit) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(audit.nextAuditDue)
    dueDate.setHours(0, 0, 0, 0)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (audit.status === 'COMPLETED') {
      return { label: 'Completed', color: 'text-brand-400', icon: CheckCircle2 }
    }
    if (audit.status === 'IN_PROGRESS') {
      return { label: 'In Progress', color: 'text-amber-400', icon: Clock }
    }
    if (daysUntilDue < 0) {
      return { label: 'Overdue', color: 'text-red-400', icon: AlertTriangle }
    }
    if (daysUntilDue <= 30) {
      return { label: `Due in ${daysUntilDue} days`, color: 'text-amber-400', icon: AlertTriangle }
    }
    return { label: 'Scheduled', color: 'text-blue-400', icon: Calendar }
  }

  const getReviewStatusInfo = (review: AccessReview) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(review.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (review.status === 'COMPLETED') {
      return { label: 'Completed', color: 'text-brand-400', icon: CheckCircle2 }
    }
    if (review.status === 'IN_PROGRESS') {
      return { label: 'In Progress', color: 'text-amber-400', icon: Clock }
    }
    if (daysUntilDue < 0) {
      return { label: 'Overdue', color: 'text-red-400', icon: AlertTriangle }
    }
    if (daysUntilDue <= 14) {
      return { label: `Due in ${daysUntilDue} days`, color: 'text-amber-400', icon: AlertTriangle }
    }
    return { label: 'Scheduled', color: 'text-blue-400', icon: Calendar }
  }

  // Get upcoming audits (next 3)
  const upcomingAudits = audits
    .filter(a => a.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.nextAuditDue).getTime() - new Date(b.nextAuditDue).getTime())
    .slice(0, 3)

  // Get upcoming reviews (next 3)
  const upcomingReviews = reviews
    .filter(r => r.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3)

  // Get recent completed reviews (last 3)
  const recentReviews = reviews
    .filter(r => r.status === 'COMPLETED')
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.reviewDate).getTime()
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.reviewDate).getTime()
      return dateB - dateA
    })
    .slice(0, 3)

  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-surface-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Audit Periods Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Audit Periods</h3>
          {canManage && (
            <Button onClick={openAddAuditModal} size="sm" className="btn-secondary">
              <Plus className="w-4 h-4 mr-0.5" />
              Add Audit
            </Button>
          )}
        </div>

        {audits.length === 0 ? (
          <p className="text-surface-400 text-sm">No audit periods tracked</p>
        ) : (
          <div className="space-y-3">
            {upcomingAudits.length > 0 ? (
              upcomingAudits.map((audit) => {
                const statusInfo = getAuditStatusInfo(audit)
                const StatusIcon = statusInfo.icon

                return (
                  <div
                    key={audit.id}
                    className="p-3 bg-surface-800 rounded-lg border border-surface-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-sm font-medium text-white">
                            {audit.framework} - {audit.auditType}
                          </span>
                          <span className={cn('text-xs px-2 py-0.5 rounded', statusInfo.color, 'bg-surface-700')}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="text-xs text-surface-400 space-y-0.5">
                          <div>Next Due: {formatDate(new Date(audit.nextAuditDue))}</div>
                          {audit.auditor && <div>Auditor: {audit.auditor}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditAuditModal(audit)}
                              className="p-1.5 text-surface-400 hover:text-brand-400 transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setAuditToDelete(audit)
                              }}
                              className="p-1.5 text-surface-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-surface-400 text-sm">No upcoming audits</p>
            )}
            {audits.length > 3 && (
              <Link
                href="/compliance"
                className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                View all {audits.length} audit periods
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Access Reviews Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Access Reviews</h3>
          {canManage && (
            <Link
              href={`/compliance/reviews/new?client=${clientId}`}
              className="btn-secondary text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Review
            </Link>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-surface-400 text-sm">No access reviews scheduled</p>
        ) : (
          <div className="space-y-4">
            {/* Upcoming Reviews */}
            {upcomingReviews.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">Upcoming</h4>
                <div className="space-y-2">
                  {upcomingReviews.map((review) => {
                    const statusInfo = getReviewStatusInfo(review)
                    const StatusIcon = statusInfo.icon

                    return (
                      <Link
                        key={review.id}
                        href={`/clients/${clientId}/access-reviews/${review.id}`}
                        className="block p-3 bg-surface-800 rounded-lg border border-surface-700 hover:border-surface-600 hover:bg-surface-800/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white">
                                Access Review - {formatDate(new Date(review.reviewDate))}
                              </span>
                              <span className={cn('text-xs px-2 py-0.5 rounded', statusInfo.color, 'bg-surface-700')}>
                                <StatusIcon className="w-3 h-3 inline mr-1" />
                                {statusInfo.label}
                              </span>
                            </div>
                            <div className="text-xs text-surface-400">
                              Due: {formatDate(new Date(review.dueDate))}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent Completed Reviews */}
            {recentReviews.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">Recent</h4>
                <div className="space-y-2">
                  {recentReviews.map((review) => (
                    <Link
                      key={review.id}
                      href={`/clients/${clientId}/access-reviews/${review.id}`}
                      className="block p-3 bg-surface-800/50 rounded-lg border border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/70 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                          <span className="text-sm text-white">
                            Access Review - {formatDate(new Date(review.reviewDate))}
                          </span>
                        </div>
                        {review.evidenceUrl && (
                          <a
                            href={review.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 text-surface-400 hover:text-brand-400 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {reviews.length > 6 && (
              <Link
                href="/compliance"
                className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
              >
                View all {reviews.length} access reviews
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Audit Modal */}
      <Sheet open={showAuditModal} onOpenChange={setShowAuditModal}>
        <SheetContent side="right" className="w-[600px] sm:w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingAudit ? 'Edit Audit Period' : 'Add Audit Period'}
            </SheetTitle>
            <SheetDescription>
              Track audit periods for compliance frameworks
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Framework Section */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection('framework')}
                className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors"
              >
                <label className="block text-sm font-medium text-surface-300 cursor-pointer flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Framework
                </label>
                <ChevronDown className={cn(
                  'w-4 h-4 text-surface-400 transition-transform',
                  openSection === 'framework' && 'rotate-180'
                )} />
              </button>
              {openSection === 'framework' && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Framework *
                    </label>
                    <Combobox
                      value={framework}
                      onChange={setFramework}
                      options={frameworks.map(f => ({
                        value: f.name,
                        label: f.name,
                      }))}
                      placeholder="Select framework..."
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Audit Type *
                    </label>
                    <Combobox
                      value={auditType}
                      onChange={setAuditType}
                      options={auditTypes.map(at => ({
                        value: at.name,
                        label: at.name,
                      }))}
                      placeholder={framework ? "Select audit type..." : "Select framework first"}
                      className="w-full"
                      disabled={!framework || auditTypes.length === 0}
                    />
                    {framework && auditTypes.length === 0 && (
                      <p className="text-xs text-surface-400 mt-1">
                        No audit types configured for this framework. Add them in Settings &gt; Frameworks.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Last Audit Date *
                    </label>
                    <Input
                      type="date"
                      value={lastAuditDate}
                      onChange={(e) => handleLastAuditDateChange(e.target.value)}
                      className="w-full bg-surface-800 border-surface-700 text-white [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Audit Period (months) *
                    </label>
                    <Input
                      type="number"
                      value={auditPeriod}
                      onChange={(e) => handleAuditPeriodChange(e.target.value)}
                      placeholder="12"
                      min="1"
                      className="w-full bg-surface-800 border-surface-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Next Audit Due *
                    </label>
                    <Input
                      type="date"
                      value={nextAuditDue}
                      onChange={(e) => setNextAuditDue(e.target.value)}
                      className="w-full bg-surface-800 border-surface-700 text-white [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                    <p className="text-xs text-surface-400 mt-1">
                      Auto-calculated from last audit date and period, but can be adjusted
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Auditor Section */}
            <div className="mt-6 pt-6 border-t border-surface-700">
              <button
                type="button"
                onClick={() => toggleSection('auditor')}
                className="w-full flex items-center justify-between p-2 hover:bg-surface-800/50 rounded-lg transition-colors mb-3"
              >
                <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                  <User className="w-4 h-4" />
                  Auditor
                </label>
                <ChevronDown className={cn(
                  'w-4 h-4 text-surface-400 transition-transform',
                  openSection === 'auditor' && 'rotate-180'
                )} />
              </button>
              {openSection === 'auditor' && (
                <div className="mt-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Auditor
                    </label>
                    <Input
                      type="text"
                      value={auditor}
                      onChange={(e) => setAuditor(e.target.value)}
                      placeholder="Auditor name or company"
                      className="w-full bg-surface-800 border-surface-700 text-white"
                      spellCheck="false"
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setShowAuditModal(false)
                resetAuditForm()
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAuditSubmit}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingAudit ? 'Update' : 'Create'
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Audit Period Confirmation Modal */}
      {auditToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)',
            pointerEvents: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAuditToDelete(null)
            }
          }}
        >
          <div 
            className="card w-full max-w-md p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  Delete Audit Period
                </h3>
                <p className="text-sm text-surface-400 mt-1">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-surface-800 rounded-lg">
              <p className="text-sm text-surface-300">
                Are you sure you want to delete the audit period for{' '}
                <span className="font-semibold text-white">
                  {auditToDelete.framework} - {auditToDelete.auditType}
                </span>?
              </p>
              <p className="text-xs text-surface-500 mt-2">
                This audit period will be permanently removed. All associated data will be lost.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setAuditToDelete(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteAudit()
                }}
                className="btn-primary flex-1 bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

