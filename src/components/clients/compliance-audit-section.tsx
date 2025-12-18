'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Shield, 
  Calendar, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
  CreatedBy?: { id: string; name: string | null; email: string | null } | null
  UpdatedBy?: { id: string; name: string | null; email: string | null } | null
}

interface ComplianceAuditSectionProps {
  clientId: string
}

export function ComplianceAuditSection({ clientId }: ComplianceAuditSectionProps) {
  const { data: session } = useSession()
  const userRole = session?.user?.role
  const canManage = userRole === 'IT_ENGINEER' || userRole === 'IT_MANAGER' || userRole === 'ADMIN'

  const [audits, setAudits] = useState<ComplianceAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingAudit, setEditingAudit] = useState<ComplianceAudit | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [framework, setFramework] = useState('')
  const [auditType, setAuditType] = useState('')
  const [lastAuditDate, setLastAuditDate] = useState('')
  const [auditPeriod, setAuditPeriod] = useState('12')
  const [nextAuditDue, setNextAuditDue] = useState('')
  const [auditor, setAuditor] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchAudits()
  }, [clientId])

  const fetchAudits = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/compliance/audits`)
      if (res.ok) {
        const data = await res.json()
        setAudits(data)
      }
    } catch (error) {
      console.error('Failed to fetch audits:', error)
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

  const resetForm = () => {
    setFramework('')
    setAuditType('')
    setLastAuditDate('')
    setAuditPeriod('12')
    setNextAuditDue('')
    setAuditor('')
    setEvidenceUrl('')
    setNotes('')
    setEditingAudit(null)
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (audit: ComplianceAudit) => {
    setFramework(audit.framework)
    setAuditType(audit.auditType)
    setLastAuditDate(new Date(audit.lastAuditDate).toISOString().split('T')[0])
    setAuditPeriod(audit.auditPeriod.toString())
    setNextAuditDue(new Date(audit.nextAuditDue).toISOString().split('T')[0])
    setAuditor(audit.auditor || '')
    setEvidenceUrl(audit.evidenceUrl || '')
    setNotes(audit.notes || '')
    setEditingAudit(audit)
    setShowAddModal(true)
  }

  const handleSubmit = async () => {
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
          lastAuditDate,
          auditPeriod: parseInt(auditPeriod),
          nextAuditDue,
          auditor: auditor || null,
          evidenceUrl: evidenceUrl || null,
          notes: notes || null,
        }),
      })

      if (res.ok) {
        toast.success(editingAudit ? 'Audit period updated' : 'Audit period created')
        setShowAddModal(false)
        resetForm()
        fetchAudits()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to save audit period')
      }
    } catch (error) {
      console.error('Error saving audit:', error)
      toast.error('Failed to save audit period')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (auditId: string) => {
    if (!confirm('Are you sure you want to delete this audit period?')) return

    try {
      const res = await fetch(`/api/clients/${clientId}/compliance/audits/${auditId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Audit period deleted')
        fetchAudits()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Failed to delete audit period')
      }
    } catch (error) {
      console.error('Error deleting audit:', error)
      toast.error('Failed to delete audit period')
    }
  }

  const getStatusInfo = (audit: ComplianceAudit) => {
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

  const frameworkOptions = [
    { value: 'SOC2', label: 'SOC 2' },
    { value: 'ISO27001', label: 'ISO 27001' },
    { value: 'HIPAA', label: 'HIPAA' },
  ]

  const auditTypeOptions = [
    { value: 'Type I', label: 'Type I' },
    { value: 'Type II', label: 'Type II' },
    { value: 'Surveillance', label: 'Surveillance' },
    { value: 'Recertification', label: 'Recertification' },
    { value: 'Risk Assessment', label: 'Risk Assessment' },
  ]

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Audit Periods</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-surface-500" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Audit Periods</h3>
          {canManage && (
            <Button onClick={openAddModal} size="sm" className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Audit Period
            </Button>
          )}
        </div>

        {audits.length === 0 ? (
          <p className="text-surface-400 text-sm">No audit periods tracked yet</p>
        ) : (
          <div className="space-y-3">
            {audits.map((audit) => {
              const statusInfo = getStatusInfo(audit)
              const StatusIcon = statusInfo.icon

              return (
                <div
                  key={audit.id}
                  className="p-4 bg-surface-800 rounded-lg border border-surface-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-white">
                          {audit.framework} - {audit.auditType}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded', statusInfo.color, 'bg-surface-700')}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-surface-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Last: {formatDate(new Date(audit.lastAuditDate))}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Next Due: {formatDate(new Date(audit.nextAuditDue))}</span>
                        </div>
                        {audit.auditor && (
                          <div>
                            <span>Auditor: {audit.auditor}</span>
                          </div>
                        )}
                        {audit.evidenceUrl && (
                          <div>
                            <a
                              href={audit.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-400 hover:text-brand-300 inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View Evidence
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(audit)}
                          className="p-2 text-surface-400 hover:text-white transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(audit.id)}
                          className="p-2 text-surface-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Sheet open={showAddModal} onOpenChange={setShowAddModal}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingAudit ? 'Edit Audit Period' : 'Add Audit Period'}
            </SheetTitle>
            <SheetDescription>
              Track audit periods for compliance frameworks
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Framework *
              </label>
              <Combobox
                value={framework}
                onChange={setFramework}
                options={frameworkOptions}
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
                options={auditTypeOptions}
                placeholder="Select audit type..."
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Last Audit Date *
              </label>
              <Input
                type="date"
                value={lastAuditDate}
                onChange={(e) => handleLastAuditDateChange(e.target.value)}
                className="w-full"
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
                min="1"
                className="w-full"
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
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Auditor
              </label>
              <Input
                value={auditor}
                onChange={(e) => setAuditor(e.target.value)}
                placeholder="Auditor name or company"
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Evidence URL
              </label>
              <Input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>

          <SheetFooter className="mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="btn-primary">
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
    </>
  )
}

