'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Save,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Mail,
  Laptop,
  ShieldAlert,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Link2,
  Settings,
  Calendar,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { SiSlack, SiGooglecalendar } from 'react-icons/si'
import { cn, getCadenceLabel, calculateNextScheduledDate, formatDate } from '@/lib/utils'
import { useScrollLock } from '@/lib/use-scroll-lock'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

interface CheckItem {
  id: string
  text: string
  checked: boolean
  notes: string
  isOptional?: boolean
}

interface CheckCategory {
  id: string
  name: string
  icon: string
  status: string
  notes: string
  items: CheckItem[]
}

interface CheckData {
  id: string
  Client: {
    id: string
    name: string
    slackChannelName: string | null
    slackChannelId?: string | null
    customCadenceDays?: number | null
    checkCadence?: string | null
  }
  assignedEngineer: {
    id: string
    name: string
    email: string
    slackUsername: string | null
    slackUserId: string | null
  }
  scheduledDate: Date
  status: string
  cadence: string
  totalTimeSeconds: number
  calendarEventLink?: string | null
  categories: CheckCategory[]
}

interface CheckExecutionProps {
  check: CheckData
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  mail: Mail,
  laptop: Laptop,
  'shield-alert': ShieldAlert,
  'clipboard-check': ClipboardCheck,
}

export function CheckExecution({ check: initialCheck }: CheckExecutionProps) {
  const router = useRouter()
  const [check, setCheck] = useState(initialCheck)
  const [categories, setCategories] = useState(initialCheck.categories)
  const isCompleted = check.status === 'COMPLETED'
  
  // Track original state for dirty checking
  const originalCategoriesRef = useRef(JSON.stringify(
    initialCheck.categories.map(c => ({
      id: c.id,
      items: c.items.map(i => ({ id: i.id, checked: i.checked, notes: i.notes }))
    }))
  ))
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    check.categories.map((c) => c.id)
  )
  const [showSlackPreview, setShowSlackPreview] = useState(false)
  const [showHarvestPicker, setShowHarvestPicker] = useState(false)
  const [harvestConnected, setHarvestConnected] = useState(false)
  const [harvestProjects, setHarvestProjects] = useState<any[]>([]) // Projects (which are clients in their setup)
  const [selectedHarvestProjectId, setSelectedHarvestProjectId] = useState<string>('')
  const [harvestProjectSearch, setHarvestProjectSearch] = useState<string>('')
  const [harvestTasks, setHarvestTasks] = useState<any[]>([])
  const [selectedHarvestTaskId, setSelectedHarvestTaskId] = useState<string>('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [harvestTaskSearch, setHarvestTaskSearch] = useState<string>('')
  const [showTaskDropdown, setShowTaskDropdown] = useState(false)
  // Helper to get local date string (YYYY-MM-DD) without UTC conversion
  const getLocalDateString = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  
  const [harvestNotes, setHarvestNotes] = useState(
    `Infra Check - ${check.Client.name} - ${new Date().toLocaleDateString()}`
  )
  const [savingHarvest, setSavingHarvest] = useState(false)
  const [harvestLogHours, setHarvestLogHours] = useState(0)
  const [harvestLogMinutes, setHarvestLogMinutes] = useState(30)
  const [harvestLogDate, setHarvestLogDate] = useState(getLocalDateString())
  
  // Connect to Harvest modal
  const [showConnectHarvest, setShowConnectHarvest] = useState(false)
  
  // Check settings/edit
  const [showSettings, setShowSettings] = useState(false)
  
  // Schedule next check modal
  const [showScheduleNextModal, setShowScheduleNextModal] = useState(false)
  const [schedulingNext, setSchedulingNext] = useState(false)
  
  // Reopen check state
  const [reopening, setReopening] = useState(false)
  
  // Calculate next scheduled date for modal
  const nextCheckInfo = useMemo(() => {
    if (!showScheduleNextModal) return null
    const effectiveCadence = check.Client.checkCadence || check.cadence
    const nextDate = calculateNextScheduledDate(
      new Date(),
      effectiveCadence,
      check.Client.customCadenceDays
    )
    return {
      effectiveCadence,
      nextDate,
      nextDateFormatted: formatDate(nextDate),
    }
  }, [showScheduleNextModal, check.Client.checkCadence, check.cadence, check.Client.customCadenceDays])
  // Format date in local timezone to avoid timezone shifts
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Parse date string (YYYY-MM-DD) and format for display
  const formatDateForDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const [scheduledDate, setScheduledDate] = useState(
    formatLocalDate(new Date(check.scheduledDate))
  )
  // Format time from scheduledDate (HH:MM)
  const formatLocalTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }
  const [scheduledTime, setScheduledTime] = useState(
    formatLocalTime(new Date(check.scheduledDate))
  )
  const [savingCheck, setSavingCheck] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Add item modal
  const [showAddItem, setShowAddItem] = useState(false)
  const [addItemCategoryId, setAddItemCategoryId] = useState<string | null>(null)
  const [newItemText, setNewItemText] = useState('')
  
  // Unsaved changes modal
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  
  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Prevent body scroll when any modal is open
  useScrollLock(
    showSlackPreview ||
    showHarvestPicker ||
    showConnectHarvest ||
    showSettings ||
    showScheduleNextModal ||
    showAddItem ||
    showDeleteModal ||
    showUnsavedModal
  )
  
  // Saving from unsaved modal
  const [savingAndLeaving, setSavingAndLeaving] = useState(false)
  
  // Handle navigation with unsaved changes check
  const handleNavigation = (url: string) => {
    // Don't check for unsaved changes if check is completed (read-only)
    if (hasUnsavedChanges && !isCompleted) {
      setPendingNavigation(url)
      setShowUnsavedModal(true)
    } else {
      window.location.href = url
    }
  }

  // Check if user has Harvest connected
  useEffect(() => {
    const checkHarvestConnection = async () => {
      try {
        const res = await fetch('/api/harvest/clients')
        
        if (res.ok) {
          const projects = await res.json() // These are actually projects (clients in their setup)
          setHarvestConnected(true)
          setHarvestProjects(projects) // Set projects directly
          
          // Try to auto-match the client name with a Harvest project
          const clientName = check.Client.name.toLowerCase()
          const matchedProject = projects.find((p: any) => {
            const projectName = p.name?.toLowerCase() || ''
            const clientNameInProject = p.client_name?.toLowerCase() || ''
            return projectName.includes(clientName) || 
                   clientName.includes(projectName) ||
                   clientNameInProject.includes(clientName) ||
                   clientName.includes(clientNameInProject)
          })
          
          if (matchedProject) {
            setSelectedHarvestProjectId(matchedProject.id.toString())
            setHarvestProjectSearch(matchedProject.name)
          }
          
          // Check if we just connected (redirected back from OAuth)
          const urlParams = new URLSearchParams(window.location.search)
          if (urlParams.get('harvest_connected') === 'success') {
            toast.success('Harvest connected successfully!', {
              description: `Found ${projects.length} projects available.`,
            })
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname)
          }
        } else {
          // Log the error for debugging
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Harvest connection check failed:', {
            status: res.status,
            statusText: res.statusText,
            error: errorData,
          })
          // Only show toast if not already connected (to avoid spam)
          if (!harvestConnected) {
            toast.error('Harvest not connected', {
              description: errorData.error || `Status: ${res.status}`,
            })
          }
          setHarvestConnected(false)
        }
      } catch (error: any) {
        console.error('❌ Error checking Harvest connection:', error)
        if (!harvestConnected) {
          toast.error('Failed to check Harvest connection', {
            description: error.message,
          })
        }
        setHarvestConnected(false)
      }
    }
    checkHarvestConnection()
  }, [])

  // Projects are already loaded from the clients endpoint (which returns projects)

  // Calculate progress
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0)
  const checkedItems = categories.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.checked).length,
    0
  )
  const progressPercent = (checkedItems / totalItems) * 100

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Toggle item checked
  const toggleItem = (categoryId: string, itemId: string) => {
    setCategories((prev) => {
      const newCategories = prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, checked: !item.checked } : item
              ),
            }
          : cat
      )
      // Check for changes after state update
      setTimeout(() => markUnsaved(newCategories), 0)
      return newCategories
    })
  }

  // Update item notes
  const updateItemNotes = (categoryId: string, itemId: string, notes: string) => {
    setCategories((prev) => {
      const newCategories = prev.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId ? { ...item, notes } : item
              ),
            }
          : cat
      )
      // Check for changes after state update
      setTimeout(() => markUnsaved(newCategories), 0)
      return newCategories
    })
  }

  // Get category completion status
  const getCategoryStatus = (category: CheckCategory) => {
    const checked = category.items.filter((i) => i.checked).length
    const total = category.items.length
    if (checked === 0) return 'pending'
    if (checked === total) return 'complete'
    return 'in_progress'
  }

  // Fetch tasks when project is selected
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedHarvestProjectId) {
        setHarvestTasks([])
        // Default to "Consulting" task if available, otherwise keep empty
        return
      }

      try {
        const res = await fetch(`/api/harvest/projects/${selectedHarvestProjectId}/tasks`)
        if (res.ok) {
          const tasks = await res.json()
          setHarvestTasks(tasks)
          
          // Auto-select "Consulting" task if available, otherwise first task
          const consultingTask = tasks.find((t: any) => 
            t.name?.toLowerCase().includes('consulting')
          )
          if (consultingTask) {
            setSelectedHarvestTaskId(consultingTask.id.toString())
            setHarvestTaskSearch(consultingTask.name)
          } else if (tasks.length > 0) {
            setSelectedHarvestTaskId(tasks[0].id.toString())
            setHarvestTaskSearch(tasks[0].name)
          }
        } else {
          setHarvestTasks([])
          setSelectedHarvestTaskId('')
          setHarvestTaskSearch('')
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
        setHarvestTasks([])
        setSelectedHarvestTaskId('')
        setHarvestTaskSearch('')
      }
    }

    fetchTasks()
  }, [selectedHarvestProjectId])
  
  // Filter projects based on search
  const filteredProjects = harvestProjects.filter((project) => {
    if (!harvestProjectSearch) return true
    const searchLower = harvestProjectSearch.toLowerCase()
    const projectName = project.name?.toLowerCase() || ''
    const clientName = project.client_name?.toLowerCase() || ''
    return projectName.includes(searchLower) || clientName.includes(searchLower)
  })

  // Filter tasks based on search
  const filteredTasks = harvestTasks.filter((task) => {
    if (!harvestTaskSearch) return true
    const searchLower = harvestTaskSearch.toLowerCase()
    const taskName = task.name?.toLowerCase() || ''
    return taskName.includes(searchLower)
  })

  // Log time directly to Harvest
  const logTimeToHarvest = async () => {
    if (!selectedHarvestProjectId) {
      toast.error('Please select a Harvest project')
      return
    }
    if (!selectedHarvestTaskId) {
      toast.error('Please select a Harvest task')
      return
    }

    const totalHours = harvestLogHours + (harvestLogMinutes / 60)
    if (totalHours <= 0) {
      toast.error('Please enter time to log')
      return
    }

    setSavingHarvest(true)
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      
      const res = await fetch('/api/harvest/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedHarvestProjectId,
          taskId: selectedHarvestTaskId,
          hours: parseFloat(totalHours.toFixed(2)),
          spentDate: harvestLogDate,
          notes: harvestNotes,
          externalReference: currentUrl,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to log time')
      }

      setShowHarvestPicker(false)
      toast.success('Time logged!', {
        description: `${totalHours.toFixed(2)} hours saved to Harvest`,
      })
    } catch (error: any) {
      toast.error('Failed to log time', {
        description: error.message,
      })
    } finally {
      setSavingHarvest(false)
    }
  }

  // Save check progress
  const saveCheckProgress = async () => {
    setSavingCheck(true)
    try {
      const res = await fetch(`/api/checks/${check.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate,
          totalTimeSeconds: check.totalTimeSeconds,
          categories: categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            status: cat.items.every(i => i.checked) ? 'complete' : 
                   cat.items.some(i => i.checked) ? 'in_progress' : 'pending',
            notes: cat.notes,
            items: cat.items.map(item => ({
              id: item.id,
              text: item.text,
              checked: item.checked,
              notes: item.notes,
            })),
          })),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save check')
      }

      const data = await res.json()
      
      // Update categories with saved IDs from server
      if (data.categories) {
        const updatedCategories = data.categories.map((cat: any) => ({
          ...cat,
          icon: categories.find(c => c.name === cat.name)?.icon || 'clipboard',
        }))
        setCategories(updatedCategories)
        
        // Update original state reference so future changes are compared against saved state
        originalCategoriesRef.current = JSON.stringify(
          updatedCategories.map((c: any) => ({
            id: c.id,
            items: c.items.map((i: any) => ({ id: i.id, checked: i.checked, notes: i.notes }))
          }))
        )
      }
      
      // Update check status if it changed
      if (data.check?.status && data.check.status !== check.status) {
        setCheck(prev => ({ ...prev, status: data.check.status }))
      }

      setHasUnsavedChanges(false)
      toast.success('Check saved!', {
        description: 'Your progress has been saved',
      })
    } catch (error: any) {
      toast.error('Failed to save check', {
        description: error.message,
      })
    } finally {
      setSavingCheck(false)
    }
  }

  // Update due date and time
  const updateDueDateAndTime = async (newDate: string, newTime: string) => {
    try {
      // Combine date and time into a datetime string
      const dateTime = new Date(`${newDate}T${newTime}:00`)
      
      const res = await fetch(`/api/checks/${check.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: dateTime.toISOString() }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update due date')
      }

      const data = await res.json()
      
      // Update the scheduled date and time state with the date from the response
      if (data.check?.scheduledDate) {
        const updatedDate = new Date(data.check.scheduledDate)
        setScheduledDate(formatLocalDate(updatedDate))
        setScheduledTime(formatLocalTime(updatedDate))
      } else {
        // Fallback to the date/time we sent
        setScheduledDate(newDate)
        setScheduledTime(newTime)
      }
      
      // Handle calendar update
      if (data.calendarEvent) {
        toast.success('Due date and calendar event updated!', {
          description: 'The event in your Google Calendar has been updated.',
        })
        // Update the check data with new calendar link if provided
        if (data.calendarEvent.link) {
          // The calendar link will be updated on next page refresh
        }
      } else if (data.calendarUpdateError) {
        toast.warning('Due date updated, but calendar event failed', {
          description: data.calendarUpdateError,
        })
      } else {
        toast.success('Due date updated!')
      }
    } catch (error: any) {
      toast.error('Failed to update due date', {
        description: error.message,
      })
      // Revert the date/time on error
      const originalDate = new Date(check.scheduledDate)
      setScheduledDate(formatLocalDate(originalDate))
      setScheduledTime(formatLocalTime(originalDate))
    }
  }

  // Update due date (for backward compatibility with DatePicker onChange)
  const updateDueDate = async (newDate: string) => {
    await updateDueDateAndTime(newDate, scheduledTime)
  }

  // Add new check item
  const addNewItem = async () => {
    if (!addItemCategoryId || !newItemText.trim()) return

    try {
      const res = await fetch(`/api/checks/${check.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: addItemCategoryId,
          text: newItemText.trim(),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add item')
      }

      const { item } = await res.json()

      // Add the new item to the local state
      setCategories(prev =>
        prev.map(cat =>
          cat.id === addItemCategoryId
            ? { ...cat, items: [...cat.items, { ...item, checked: false, notes: '' }] }
            : cat
        )
      )

      setNewItemText('')
      setShowAddItem(false)
      setAddItemCategoryId(null)
      toast.success('Item added!')
    } catch (error: any) {
      toast.error('Failed to add item', {
        description: error.message,
      })
    }
  }

  // Check if current state differs from original
  const checkForChanges = useCallback((currentCategories: CheckCategory[]) => {
    const currentState = JSON.stringify(
      currentCategories.map(c => ({
        id: c.id,
        items: c.items.map(i => ({ id: i.id, checked: i.checked, notes: i.notes }))
      }))
    )
    return currentState !== originalCategoriesRef.current
  }, [])
  
  // Track unsaved changes (no more autosave - user clicks save button)
  const markUnsaved = useCallback((currentCategories: CheckCategory[]) => {
    const hasChanges = checkForChanges(currentCategories)
    setHasUnsavedChanges(hasChanges)
  }, [checkForChanges])

  // Generate Slack report
  const generateReport = () => {
    // Get assigned engineer's Slack mention
    // Slack requires <@USER_ID> format for mentions to work properly
    // Always use slackUserId if available for proper @mentions
    const engineerSlackMention = check.assignedEngineer?.slackUserId
      ? `<@${check.assignedEngineer.slackUserId}>`
      : check.assignedEngineer?.name || 'the assigned engineer'
    
    // Debug: Log what we're using for the mention
    if (process.env.NODE_ENV === 'development') {
    }
    
    // Use <!here> for @here mention to work in Slack
    let report = `Hi <!here> this is ${check.Client.name}'s infrastructure report!\n\n`

    categories.forEach((cat) => {
      const allGood = cat.items.every((item) => item.checked)
      const hasIssues = cat.items.some((item) => item.notes && item.notes.trim())

      // Use Slack's bold formatting and proper bullet points
      report += `*${cat.name}:*\n`
      if (allGood && !hasIssues) {
        report += `  • All good, no exceptions noted.\n`
      } else {
        cat.items.forEach((item) => {
          if (item.notes && item.notes.trim()) {
            report += `  • ${item.notes}\n`
          }
        })
        if (!hasIssues) {
          report += `  • All good, no exceptions noted.\n`
        }
      }
      report += '\n'
    })

    report += `Give ${engineerSlackMention} a ping if you have any questions about the report or findings noted!`
    return report
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Completed Banner */}
      {isCompleted && (
        <div className="bg-brand-500/10 border-b border-brand-500/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-brand-400" />
            <div>
              <p className="text-sm font-medium text-white">This check is completed and locked</p>
              <p className="text-xs text-surface-400">All items and notes are read-only. Reopen the check to make changes.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              setReopening(true)
              try {
                const res = await fetch(`/api/checks/${check.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'IN_PROGRESS' }),
                })
                
                if (!res.ok) {
                  const errorData = await res.json().catch(() => ({ error: 'Failed to reopen check' }))
                  throw new Error(errorData.error || `Failed to reopen check (${res.status})`)
                }
                
                const data = await res.json()
                console.log('Reopen check response:', data) // Debug log
                
                // Verify the status was actually updated
                if (data.check) {
                  const newStatus = data.check.status || 'IN_PROGRESS'
                  
                  // Update check state with the response
                  setCheck(prev => ({ 
                    ...prev, 
                    status: newStatus,
                    completedAt: data.check.completedAt || null,
                  }))
                  
                  // Verify the update worked
                  if (newStatus === 'IN_PROGRESS') {
                    toast.success('Check reopened', {
                      description: 'You can now edit items and notes',
                    })
                    
                    // Use router refresh to update the page data
                    router.refresh()
                  } else {
                    console.warn('Status update may have failed:', newStatus)
                    toast.warning('Check may not have reopened', {
                      description: 'Please refresh the page',
                    })
                  }
                } else {
                  throw new Error('Invalid response from server')
                }
              } catch (error: any) {
                console.error('Reopen check error:', error)
                toast.error('Failed to reopen check', { 
                  description: error.message || 'An error occurred'
                })
              } finally {
                setReopening(false)
              }
            }}
            disabled={reopening}
            className={cn(
              "px-4 py-2 text-sm bg-surface-800 hover:bg-surface-700 text-white rounded-lg transition-colors flex items-center gap-2",
              reopening && "opacity-70 cursor-not-allowed"
            )}
          >
            {reopening ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Reopening...
              </>
            ) : (
              'Reopen Check'
            )}
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-950/95 backdrop-blur-xl border-b border-surface-800">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigation('/checks')}
                className="p-2 hover:bg-surface-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-surface-400" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {check.Client.name} - Infrastructure Check
                </h1>
                <div className="flex items-center gap-3 text-sm text-surface-400 mt-0.5">
                  <span>{getCadenceLabel(check.cadence)} • Assigned to {check.assignedEngineer.name}</span>
                  <span className="text-surface-600">•</span>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="hover:text-surface-200 transition-colors"
                  >
                    Due: {formatDateForDisplay(scheduledDate)}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Save Button - appears when there are unsaved changes (hidden when completed) */}
              {hasUnsavedChanges && !isCompleted && (
                <button
                  onClick={saveCheckProgress}
                  disabled={savingCheck}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-all disabled:opacity-70 animate-in fade-in slide-in-from-right-2 duration-200"
                >
                  {savingCheck ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingCheck ? 'Saving...' : 'Save'}
                </button>
              )}

              {/* Log Time to Harvest (disabled when completed) */}
              {!isCompleted && (
                <button
                  onClick={() => {
                    if (!harvestConnected) {
                      setShowConnectHarvest(true)
                    } else {
                      setShowHarvestPicker(true)
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-xl transition-colors"
                  title="Log time to Harvest"
                >
                  <Clock className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-300">Log Time</span>
                </button>
              )}

              {/* Complete Button (hidden when already completed) */}
              {!isCompleted && (
                <button
                  onClick={async () => {
                    try {
                      // Save progress first
                      await saveCheckProgress()
                      // Then show modal to schedule next check
                      setShowScheduleNextModal(true)
                    } catch (error: any) {
                      toast.error('Failed to save check', { description: error.message })
                    }
                  }}
                  className="btn-primary"
                  disabled={progressPercent < 100}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete
                </button>
              )}
              {check.calendarEventLink && (
                <a
                  href={check.calendarEventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-surface-500 hover:text-brand-400 hover:bg-brand-400/10 rounded-lg transition-colors"
                  title="Open in Google Calendar"
                >
                  <SiGooglecalendar className="w-5 h-5" />
                </a>
              )}
              <button
                onClick={() => setShowSlackPreview(true)}
                className="p-2 text-surface-500 hover:text-[#4A154B] hover:bg-[#4A154B]/10 rounded-lg transition-colors"
                title="Post to Slack"
                disabled={progressPercent < 100}
              >
                <SiSlack className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete check"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  progressPercent === 100 ? 'bg-brand-500' : 'bg-brand-500/70'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm text-surface-400 min-w-[100px]">
              {checkedItems}/{totalItems} complete
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {categories.map((category) => {
            const Icon = iconMap[category.icon] || Shield
            const isExpanded = expandedCategories.includes(category.id)
            const status = getCategoryStatus(category)
            const checkedCount = category.items.filter((i) => i.checked).length

            return (
              <div
                key={category.id}
                className={cn(
                  'card overflow-hidden transition-all duration-200',
                  status === 'complete' && 'border-brand-500/30'
                )}
              >
                {/* Category header */}
                <button
                  onClick={() => !isCompleted && toggleCategory(category.id)}
                  disabled={isCompleted}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 transition-colors',
                    !isCompleted && 'hover:bg-surface-800/50',
                    isCompleted && 'cursor-default'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center',
                      status === 'complete' && 'bg-brand-500/20',
                      status === 'in_progress' && 'bg-yellow-500/20',
                      status === 'pending' && 'bg-surface-700/50'
                    )}
                  >
                    {status === 'complete' ? (
                      <CheckCircle2 className="w-5 h-5 text-brand-400" />
                    ) : (
                      <Icon
                        className={cn(
                          'w-5 h-5',
                          status === 'in_progress'
                            ? 'text-yellow-400'
                            : 'text-surface-400'
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    <p className="text-sm text-surface-400">
                      {checkedCount}/{category.items.length} items complete
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-surface-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-surface-400" />
                  )}
                </button>

                {/* Category items */}
                {isExpanded && (
                  <div className="border-t border-surface-700/50 divide-y divide-surface-700/50">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'p-4 transition-colors',
                          item.checked && 'bg-brand-500/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => !isCompleted && toggleItem(category.id, item.id)}
                            disabled={isCompleted}
                            className={cn(
                              'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                              item.checked
                                ? 'bg-brand-500 border-brand-500'
                                : 'border-surface-500 hover:border-brand-500',
                              isCompleted && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {item.checked && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p
                              className={cn(
                                'text-sm',
                                item.checked
                                  ? 'text-surface-400 line-through'
                                  : 'text-surface-200'
                              )}
                            >
                              {item.text}
                            </p>
                            {item.isOptional && (
                              <span className="inline-block mt-1 text-xs text-surface-500 bg-surface-700/50 px-2 py-0.5 rounded">
                                Optional
                              </span>
                            )}
                            {/* Notes input */}
                            <div className="mt-2">
                              <textarea
                                placeholder="Add notes or findings..."
                                value={item.notes}
                                onChange={(e) =>
                                  !isCompleted && updateItemNotes(category.id, item.id, e.target.value)
                                }
                                disabled={isCompleted}
                                className={cn(
                                  'w-full px-3 py-2 bg-surface-800 border border-surface-600 rounded-lg text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all resize-none',
                                  isCompleted && 'opacity-50 cursor-not-allowed'
                                )}
                                rows={1}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Add Item Button */}
                    {!isCompleted && (
                      <div className="p-4">
                        <button
                          onClick={() => {
                            setAddItemCategoryId(category.id)
                            setShowAddItem(true)
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 rounded-lg border border-dashed border-surface-600 hover:border-surface-500 transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          Add Item
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Harvest Picker Modal */}
      {showHarvestPicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Log Time to Harvest
              </h2>
              <button
                onClick={() => setShowHarvestPicker(false)}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Check Info */}
              <div className="p-4 bg-surface-800 rounded-lg">
                <p className="text-sm text-surface-400 mb-1">Check</p>
                <p className="font-medium text-white">{check.Client.name} - Infrastructure Check</p>
              </div>

              {/* Harvest Project Selection - Searchable */}
              <div>
                <label className="label">Harvest Project</label>
                <div className="relative">
                  <input
                    type="text"
                    value={harvestProjectSearch}
                    onChange={(e) => {
                      setHarvestProjectSearch(e.target.value)
                      setShowProjectDropdown(true)
                    }}
                    onFocus={() => setShowProjectDropdown(true)}
                    onBlur={() => {
                      // Delay closing to allow click on dropdown item
                      setTimeout(() => setShowProjectDropdown(false), 200)
                    }}
                    placeholder={harvestProjects.length === 0 ? 'Loading projects...' : 'Type to search projects...'}
                    className="input w-full"
                    disabled={harvestProjects.length === 0}
                  />
                  {showProjectDropdown && filteredProjects.length > 0 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()} // Prevent onBlur when clicking dropdown
                    >
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => {
                            setSelectedHarvestProjectId(project.id.toString())
                            setHarvestProjectSearch(project.name)
                            setShowProjectDropdown(false)
                            setSelectedHarvestTaskId('') // Reset task when project changes
                            setHarvestTaskSearch('') // Reset task search too
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm text-surface-200 transition-colors"
                        >
                          <div className="font-medium">{project.name}</div>
                          {project.client_name && (
                            <div className="text-xs text-surface-500">{project.client_name}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {harvestProjects.length > 0 && (
                  <p className="text-xs text-surface-500 mt-1">
                    {filteredProjects.length} of {harvestProjects.length} project{harvestProjects.length !== 1 ? 's' : ''} shown
                  </p>
                )}
              </div>

              {/* Harvest Task Selection - Searchable */}
              <div>
                <label className="label">Harvest Task</label>
                <div className="relative">
                  <input
                    type="text"
                    value={harvestTaskSearch}
                    onChange={(e) => {
                      setHarvestTaskSearch(e.target.value)
                      setShowTaskDropdown(true)
                    }}
                    onFocus={() => setShowTaskDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowTaskDropdown(false), 200)
                    }}
                    placeholder={
                      !selectedHarvestProjectId
                        ? 'Select a project first...'
                        : harvestTasks.length === 0
                        ? 'Loading tasks...'
                        : 'Type to search tasks...'
                    }
                    className="input w-full"
                    disabled={harvestTasks.length === 0 || !selectedHarvestProjectId}
                  />
                  {showTaskDropdown && filteredTasks.length > 0 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {filteredTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setSelectedHarvestTaskId(task.id.toString())
                            setHarvestTaskSearch(task.name)
                            setShowTaskDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-700 text-sm text-surface-200 transition-colors"
                        >
                          <div className="font-medium">{task.name}</div>
                          {task.billable && (
                            <div className="text-xs text-brand-400">Billable</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedHarvestProjectId && harvestTasks.length > 0 && (
                  <p className="text-xs text-surface-500 mt-1">
                    {filteredTasks.length} of {harvestTasks.length} task{harvestTasks.length !== 1 ? 's' : ''} shown
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={harvestNotes}
                  onChange={(e) => setHarvestNotes(e.target.value)}
                  className="input w-full"
                  rows={3}
                  placeholder="Time entry notes..."
                />
              </div>

              {/* Time and Date inputs */}
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Time</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={harvestLogHours}
                          onChange={(e) => setHarvestLogHours(Math.max(0, parseInt(e.target.value) || 0))}
                          className="input w-full text-center"
                          placeholder="0"
                        />
                        <p className="text-xs text-surface-500 text-center mt-1">hours</p>
                      </div>
                      <span className="text-2xl text-surface-400 font-bold">:</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={harvestLogMinutes}
                          onChange={(e) => setHarvestLogMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="input w-full text-center"
                          placeholder="30"
                        />
                        <p className="text-xs text-surface-500 text-center mt-1">minutes</p>
                      </div>
                    </div>
                  </div>
                  <DatePicker
                    value={harvestLogDate}
                    onChange={setHarvestLogDate}
                    label="Date"
                  />
                </div>

            </div>
            
            {/* Actions - Fixed at bottom */}
            <div className="px-6 py-4 border-t border-surface-700/50 flex items-center justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowHarvestPicker(false)
                  setShowProjectDropdown(false)
                }}
                className="btn-ghost whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={logTimeToHarvest}
                className="btn-primary whitespace-nowrap"
                disabled={savingHarvest || !selectedHarvestProjectId || !selectedHarvestTaskId || (harvestLogHours === 0 && harvestLogMinutes === 0)}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slack Preview Modal */}
      {showSlackPreview && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Post to Slack
              </h2>
              <button
                onClick={() => setShowSlackPreview(false)}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <label className="label">Channel</label>
                {check.Client.slackChannelName ? (
                  <div className="flex items-center gap-2 p-3 bg-surface-800 rounded-lg">
                    <MessageSquare className="w-4 h-4 text-surface-400" />
                    <span className="text-surface-200">
                      {check.Client.slackChannelName}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-800/50 border border-dashed border-surface-700 rounded-lg">
                    <p className="text-sm text-surface-400 mb-2">No channel configured</p>
                    <p className="text-xs text-surface-500">
                      Connect a Slack channel on the{' '}
                      <Link 
                        href={`/clients/${check.Client.id}`}
                        className="text-brand-400 hover:text-brand-300 underline"
                        onClick={() => setShowSlackPreview(false)}
                      >
                        client detail page
                      </Link>
                      {' '}to post messages.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Message Preview</label>
                <div className="p-4 bg-surface-800 rounded-lg">
                  <pre className="text-sm text-surface-200 whitespace-pre-wrap font-sans">
                    {generateReport()}
                  </pre>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-surface-700/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSlackPreview(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                disabled={!check.Client.slackChannelName}
                onClick={async () => {
                  try {
                    // Fetch latest check data to ensure we have current assignee
                    const checkRes = await fetch(`/api/checks/${check.id}`)
                    if (checkRes.ok) {
                      const latestCheck = await checkRes.json()
                      // Update check state with latest assignee info
                      setCheck(prev => ({
                        ...prev,
                        assignedEngineer: latestCheck.assignedEngineer || prev.assignedEngineer,
                      }))
                      // Wait a moment for state to update, then generate report
                      await new Promise(resolve => setTimeout(resolve, 100))
                    }
                    
                    // Generate report with current check state
                    const report = generateReport()
                    const res = await fetch('/api/slack/post', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        checkId: check.id,
                        message: report,
                      }),
                    })

                    if (!res.ok) {
                      const error = await res.json()
                      throw new Error(error.error || 'Failed to post to Slack')
                    }

                    toast.success('Posted to Slack!', {
                      description: `Message sent to ${check.Client.slackChannelName || 'Slack channel'}`,
                    })
                    setShowSlackPreview(false)
                    // Refresh to get updated check data (including any assignee changes)
                    router.refresh()
                  } catch (error: any) {
                    toast.error('Failed to post to Slack', {
                      description: error.message,
                    })
                  }
                }}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-4 h-4" />
                Post to Slack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connect to Harvest Modal */}
      {showConnectHarvest && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR-x1W951kD0L0siqZV74ycoymmFVvoKH88fQ&s"
                  alt="Harvest"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Connect to Harvest
              </h2>
              <p className="text-surface-400 mb-6">
                Connect your Harvest account to log time directly from this app. You'll be redirected to Harvest to authorize access.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowConnectHarvest(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const returnTo = encodeURIComponent(window.location.pathname)
                    window.location.href = `/api/harvest/auth?returnTo=${returnTo}`
                  }}
                  className="btn-primary"
                >
                  Connect Harvest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-lg animate-scale-in">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Check Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Due Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  value={scheduledDate}
                  onChange={(newDate) => updateDueDateAndTime(newDate, scheduledTime)}
                  label="Due Date"
                />
                <TimePicker
                  value={scheduledTime}
                  onChange={(newTime) => updateDueDateAndTime(scheduledDate, newTime)}
                  label="Time"
                />
              </div>
              <p className="text-xs text-surface-500 -mt-2">
                Change the scheduled date and time for this check
              </p>

              {/* Check Info */}
              <div className="p-4 bg-surface-800 rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-surface-400">Client</span>
                  <span className="text-sm text-surface-200">{check.Client.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-surface-400">Assigned To</span>
                  <span className="text-sm text-surface-200">{check.assignedEngineer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-surface-400">Cadence</span>
                  <span className="text-sm text-surface-200">{getCadenceLabel(check.cadence)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-surface-400">Status</span>
                  <span className="text-sm text-surface-200">{check.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-surface-400">Categories</span>
                  <span className="text-sm text-surface-200">{categories.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-surface-400">Total Items</span>
                  <span className="text-sm text-surface-200">
                    {categories.reduce((sum, c) => sum + c.items.length, 0)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-surface-700/50 flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-scale-in">
            <div className="p-4 border-b border-surface-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Check Item
              </h2>
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setNewItemText('')
                  setAddItemCategoryId(null)
                }}
                className="p-2 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Category</label>
                <div className="p-3 bg-surface-800 rounded-lg text-surface-200">
                  {categories.find(c => c.id === addItemCategoryId)?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <label className="label">Item Text</label>
                <textarea
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  placeholder="Enter the check item description..."
                  className="input w-full"
                  rows={3}
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 border-t border-surface-700/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddItem(false)
                  setNewItemText('')
                  setAddItemCategoryId(null)
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={addNewItem}
                disabled={!newItemText.trim()}
                className="btn-primary"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm animate-scale-in">
            <div className="p-5">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-white text-center mb-1">
                Unsaved Changes
              </h2>
              <p className="text-sm text-surface-400 text-center mb-5">
                Save your progress before leaving?
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    setShowUnsavedModal(false)
                    setPendingNavigation(null)
                  }}
                  className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
                  disabled={savingAndLeaving}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (pendingNavigation) {
                      window.location.href = pendingNavigation
                    }
                  }}
                  className="px-4 py-2 text-sm bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg transition-colors"
                  disabled={savingAndLeaving}
                >
                  Don't Save
                </button>
                <button
                  onClick={async () => {
                    setSavingAndLeaving(true)
                    await saveCheckProgress()
                    if (pendingNavigation) {
                      window.location.href = pendingNavigation
                    }
                  }}
                  className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-70"
                  disabled={savingAndLeaving}
                >
                  {savingAndLeaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm animate-scale-in">
            <div className="p-5">
              <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white text-center mb-1">
                Delete Check
              </h2>
              <p className="text-sm text-surface-400 text-center mb-5">
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      const res = await fetch(`/api/checks/${check.id}`, { method: 'DELETE' })
                      if (!res.ok) throw new Error('Failed to delete check')
                      toast.success('Check deleted')
                      window.location.href = '/checks'
                    } catch (error: any) {
                      toast.error('Failed to delete check', { description: error.message })
                      setDeleting(false)
                      setShowDeleteModal(false)
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-70"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Next Check Modal */}
      {showScheduleNextModal && nextCheckInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-800 border border-surface-700 rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-surface-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Schedule Next Check?</h3>
              </div>
              <button
                onClick={() => setShowScheduleNextModal(false)}
                className="p-1 hover:bg-surface-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-surface-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-surface-300">
                Would you like to automatically schedule the next infrastructure check for{' '}
                <span className="font-semibold text-white">{check.Client.name}</span>?
              </p>
              
              <div className="bg-surface-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Next scheduled date:</span>
                  <span className="text-sm font-medium text-white">{nextCheckInfo.nextDateFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Cadence:</span>
                  <span className="text-sm font-medium text-white">{getCadenceLabel(nextCheckInfo.effectiveCadence)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-400">Assigned engineer:</span>
                  <span className="text-sm font-medium text-white">{check.assignedEngineer.name}</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-surface-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    // Skip scheduling - just complete the check
                    try {
                      const res = await fetch(`/api/checks/${check.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'COMPLETED' }),
                      })
                      if (!res.ok) throw new Error('Failed to complete check')
                      toast.success('Check marked as complete!')
                      setShowScheduleNextModal(false)
                      window.location.href = '/checks'
                    } catch (error: any) {
                      toast.error('Failed to complete check', { description: error.message })
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-surface-700 hover:bg-surface-600 text-surface-200 rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={async () => {
                    setSchedulingNext(true)
                    try {
                      // First complete the current check
                      const completeRes = await fetch(`/api/checks/${check.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'COMPLETED' }),
                      })
                      if (!completeRes.ok) throw new Error('Failed to complete check')
                      
                      // Then create the next check
                      // Preserve the time from the original scheduled date
                      const originalTime = new Date(check.scheduledDate)
                      nextCheckInfo.nextDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0)
                      
                      const createRes = await fetch('/api/checks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clientId: check.Client.id,
                          engineerName: check.assignedEngineer.name,
                          cadence: nextCheckInfo.effectiveCadence,
                          scheduledDate: nextCheckInfo.nextDate.toISOString(),
                          createCalendarEvent: true,
                          sendReminder: false,
                        }),
                      })
                      
                      if (!createRes.ok) {
                        const errorData = await createRes.json()
                        throw new Error(errorData.error || 'Failed to create next check')
                      }
                      
                      toast.success('Check completed and next check scheduled!', {
                        description: `Next check scheduled for ${nextCheckInfo.nextDateFormatted}`,
                      })
                      setShowScheduleNextModal(false)
                      window.location.href = '/checks'
                    } catch (error: any) {
                      toast.error('Failed to schedule next check', { description: error.message })
                      setSchedulingNext(false)
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                  disabled={schedulingNext}
                >
                  {schedulingNext ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Next Check'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

