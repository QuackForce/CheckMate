'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Building2, 
  User, 
  Calendar, 
  Loader2,
  ArrowLeft,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { hasPermission } from '@/lib/permissions'
import { useSession } from 'next-auth/react'

interface Client {
  id: string
  name: string
  status: string
}

interface Framework {
  id: string
  name: string
  category: string
}

interface User {
  id: string
  name: string | null
  email: string | null
}

export default function NewAccessReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const preselectedClientId = searchParams.get('client')
  
  const [clients, setClients] = useState<Client[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Client selection
  const [clientId, setClientId] = useState('')
  
  // Form state
  const [framework, setFramework] = useState('')
  const [reviewDate, setReviewDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [cadence, setCadence] = useState('QUARTERLY')
  const [customDays, setCustomDays] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [autoSchedule, setAutoSchedule] = useState(true)

  // Get selected client details
  const selectedClient = clients.find(c => c.id === clientId)
  
  // Filter clients based on status
  const filteredClients = clients.filter(c => c.status === 'ACTIVE')

  useEffect(() => {
    fetchData()
    // Set default dates
    const today = new Date()
    setReviewDate(today.toISOString().split('T')[0])
    // Default due date is 90 days (quarterly)
    const due = new Date(today)
    due.setDate(due.getDate() + 90)
    setDueDate(due.toISOString().split('T')[0])
  }, [])

  // Set client ID once clients are loaded (for preselected)
  useEffect(() => {
    if (preselectedClientId && clients.length > 0 && !clientId) {
      const preselected = clients.find(c => c.id === preselectedClientId)
      if (preselected) {
        setClientId(preselectedClientId)
      }
    }
  }, [preselectedClientId, clients, clientId])

  // Calculate due date based on cadence
  useEffect(() => {
    if (reviewDate && cadence && cadence !== 'CUSTOM') {
      const review = new Date(reviewDate)
      let days = 90 // Default quarterly
      
      if (cadence === 'SEMI_ANNUAL') {
        days = 180
      } else if (cadence === 'ANNUAL') {
        days = 365
      }
      
      const due = new Date(review)
      due.setDate(due.getDate() + days)
      setDueDate(due.toISOString().split('T')[0])
    }
  }, [reviewDate, cadence])

  const fetchData = async () => {
    try {
      const [clientsRes, frameworksRes, usersRes] = await Promise.all([
        fetch('/api/clients?limit=200&status=ACTIVE'),
        fetch('/api/frameworks?activeOnly=true'),
        fetch('/api/users?limit=200')
      ])
      
      if (clientsRes.ok) {
        const data = await clientsRes.json()
        setClients(data.clients || [])
      }
      
      if (frameworksRes.ok) {
        const data = await frameworksRes.json()
        setFrameworks(data || [])
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        const usersList = data.users || data || []
        setUsers(usersList.filter((u: User) => u.name || u.email))
      }
    } catch (err) {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!clientId) {
      setError('Please select a client')
      setSubmitting(false)
      return
    }

    if (!reviewDate || !dueDate) {
      setError('Please select review date and due date')
      setSubmitting(false)
      return
    }

    if (cadence === 'CUSTOM' && !customDays) {
      setError('Please specify custom days')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/clients/${clientId}/access-reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framework: framework || null,
          reviewDate,
          dueDate,
          cadence,
          customDays: cadence === 'CUSTOM' ? parseInt(customDays) : null,
          assignedToId: assignedToId || null,
          autoSchedule,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create access review')
      }

      const data = await res.json()
      
      toast.success('Access review scheduled successfully!', {
        description: `Review for ${selectedClient?.name} has been scheduled.`
      })
      
      // Redirect to the review execution page
      router.push(`/clients/${clientId}/access-reviews/${data.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to schedule access review')
      toast.error('Failed to schedule access review', {
        description: err.message
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header 
          title="Schedule Access Review"
          action={{ label: 'Back', href: '/compliance' }}
        />
        <div className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-surface-500" />
        </div>
      </>
    )
  }

  const userRole = session?.user?.role
  const canManage = hasPermission(userRole, 'compliance:manage')

  if (!canManage) {
    return (
      <>
        <Header 
          title="Schedule Access Review"
          action={{ label: 'Back', href: '/compliance' }}
        />
        <div className="flex-1 p-6">
          <div className="card p-12 text-center">
            <p className="text-surface-400">You don't have permission to schedule access reviews.</p>
            <Link href="/compliance" className="text-brand-400 hover:text-brand-300 mt-4 inline-block">
              Return to Compliance
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header 
        title="Schedule Access Review"
        action={{ label: 'Back', href: '/compliance' }}
      />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Client Selection */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Client <span className="text-red-400">*</span>
            </label>
            <Combobox
              value={clientId}
              onChange={(value) => {
                setClientId(value)
              }}
              options={filteredClients.map(client => ({
                value: client.id,
                label: client.name,
              }))}
              placeholder="Search and select a client..."
            />
          </div>

          {/* Framework Selection */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Framework (Optional)
            </label>
            <Combobox
              value={framework}
              onChange={setFramework}
              options={[
                { value: '', label: 'None (General Review)' },
                ...frameworks.map(f => ({
                  value: f.id,
                  label: f.name,
                }))
              ]}
              placeholder="Select a framework..."
            />
          </div>

          {/* Dates and Cadence */}
          <div className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Review Date <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="bg-surface-800 border-surface-700 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Cadence <span className="text-red-400">*</span>
              </label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              >
                <option value="QUARTERLY">Quarterly (90 days)</option>
                <option value="SEMI_ANNUAL">Semi-Annual (180 days)</option>
                <option value="ANNUAL">Annual (365 days)</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            {cadence === 'CUSTOM' && (
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Custom Days <span className="text-red-400">*</span>
                </label>
                <Input
                  type="number"
                  value={customDays}
                  onChange={(e) => {
                    setCustomDays(e.target.value)
                    if (reviewDate && e.target.value) {
                      const review = new Date(reviewDate)
                      const due = new Date(review)
                      due.setDate(due.getDate() + parseInt(e.target.value))
                      setDueDate(due.toISOString().split('T')[0])
                    }
                  }}
                  placeholder="Enter number of days"
                  min="1"
                  className="bg-surface-800 border-surface-700 text-white"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Due Date <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-surface-800 border-surface-700 text-white"
                required
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Assign To (Optional)
            </label>
            <Combobox
              value={assignedToId}
              onChange={setAssignedToId}
              options={users.map(user => ({
                value: user.id,
                label: user.name || user.email || 'Unknown',
              }))}
              placeholder="Search and select a user..."
            />
            <p className="text-xs text-surface-400 mt-2">
              Typically assigned to a GRC Engineer who owns the review process
            </p>
          </div>

          {/* Auto-schedule */}
          <div className="card p-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(e) => setAutoSchedule(e.target.checked)}
                className="w-4 h-4 rounded border-surface-700 bg-surface-800 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-surface-300">
                Auto-schedule next review after completion
              </span>
            </label>
            <p className="text-xs text-surface-400 mt-2 ml-7">
              When this review is completed, automatically schedule the next one based on the cadence
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="card p-4 bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Review
                </>
              )}
            </Button>
            <Link href="/compliance">
              <Button type="button" variant="ghost" className="text-surface-400 hover:text-white">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}

