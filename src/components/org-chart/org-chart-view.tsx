'use client'

import { useState, useMemo } from 'react'
import { Users, Wrench, Shield, Briefcase, Network, Building2, Crown, Search, Grid3x3, GitBranch, Copy, GripVertical, Plus, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Combobox } from '@/components/ui/combobox'
import { useRouter } from 'next/navigation'

export interface OrgUserNode {
  id: string
  name: string
  jobTitle: string | null
  team: string | null
  managerName: string | null
  children: OrgUserNode[]
}

interface OrgChartViewProps {
  roots?: OrgUserNode[]
  groupedRoots?: { team: string; nodes: OrgUserNode[] }[]
  canEdit?: boolean
}

function getTeamIcon(teamName: string) {
  const name = teamName.toLowerCase()
  if (name.includes('system engineer') || name.includes('se')) return Wrench
  if (name.includes('grc')) return Shield
  if (name.includes('network')) return Network
  if (name.includes('software engineer')) return Wrench
  if (name.includes('consultant') || name.includes('it manager')) return Briefcase
  if (name.includes('c suite') || name.includes('c-suite')) return Crown
  if (name.includes('facilities')) return Building2
  return Users
}

function PersonCard({ 
  node, 
  isManager = false, 
  canEdit = false,
  isDragging = false,
  isDragOver = false,
  hasManager = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onDuplicate,
  onRemoveManager
}: { 
  node: OrgUserNode
  isManager?: boolean
  canEdit?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  hasManager?: boolean
  onDragStart?: (e: React.DragEvent, node: OrgUserNode) => void
  onDragOver?: (e: React.DragEvent, nodeId: string, isManager: boolean) => void
  onDrop?: (e: React.DragEvent, nodeId: string, targetName: string) => void
  onDragEnd?: () => void
  onDuplicate?: (node: OrgUserNode) => void
  onRemoveManager?: (userId: string, userName: string) => void
}) {
  // Show manager styling if they have children OR if they have "manager" in their title
  const hasChildren = node.children && node.children.length > 0
  const isManagerByTitle = node.jobTitle?.toLowerCase().includes('manager') || 
                          node.jobTitle?.toLowerCase().includes('director') ||
                          ['ceo', 'cto', 'coo', 'cfo', 'cpo'].some(title => 
                            node.jobTitle?.toLowerCase().includes(title)
                          )
  const showManagerStyle = isManager && (hasChildren || isManagerByTitle)
  // Allow dropping on manager cards even if they don't have children yet (for initial assignment)
  const canAcceptDrop = isManager // Managers can always accept drops, even without children yet
  
  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => canEdit && onDragStart?.(e, node)}
      onDragEnd={() => canEdit && onDragEnd?.()}
      onDragOver={(e) => {
        if (canEdit && canAcceptDrop) {
          onDragOver?.(e, node.id, true)
        }
      }}
      onDrop={(e) => {
        if (canEdit && canAcceptDrop) {
          onDrop?.(e, node.id, node.name)
        }
      }}
      onDragLeave={() => {}}
      className={cn(
        'card p-4 border-surface-700 h-full transition-all relative',
        showManagerStyle ? 'bg-brand-500/10 border-brand-500/30' : 'bg-surface-800/60',
        canEdit && 'cursor-move hover:border-brand-500/30',
        isDragging && 'opacity-50 scale-95',
        isDragOver && canAcceptDrop && 'border-brand-500 ring-2 ring-brand-500/50 bg-brand-500/20',
        !canAcceptDrop && canEdit && 'cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          {canEdit && (
            <GripVertical className="w-3 h-3 text-surface-500 mb-1" />
          )}
          <p className={cn('font-semibold text-white', showManagerStyle && 'text-brand-300')}>
            {node.name}
          </p>
          {node.jobTitle && (
            <p className={cn('text-sm', showManagerStyle ? 'text-brand-200' : 'text-surface-400')}>
              {node.jobTitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canEdit && hasManager && onRemoveManager && (
            <button
              onClick={() => onRemoveManager(node.id, node.name)}
              className="p-1 text-surface-500 hover:text-red-400 transition-colors"
              title="Remove manager"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {canEdit && onDuplicate && (
            <button
              onClick={() => onDuplicate(node)}
              className="p-1 text-surface-500 hover:text-brand-400 transition-colors"
              title="Duplicate to another team"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {isDragOver && canAcceptDrop && (
        <div className="absolute inset-0 border-2 border-dashed border-brand-500 bg-brand-500/10 rounded-lg flex items-center justify-center">
          <p className="text-xs text-brand-300 font-medium">Drop here to assign manager</p>
        </div>
      )}
    </div>
  )
}

function TreeNode({ node, level = 0, searchQuery = '', isLast = false, parentIsLast = [] }: { 
  node: OrgUserNode
  level?: number
  searchQuery?: string
  isLast?: boolean
  parentIsLast?: boolean[]
}) {
  const hasChildren = node.children && node.children.length > 0
  const matchesSearch = !searchQuery || 
    node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.team?.toLowerCase().includes(searchQuery.toLowerCase())
  
  if (!matchesSearch && !hasChildren) return null
  
  // Check if any children match
  const matchingChildren = hasChildren ? node.children.filter(child => {
    const childMatches = child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.team?.toLowerCase().includes(searchQuery.toLowerCase())
    return childMatches || (child.children && child.children.length > 0)
  }) : []
  
  const showNode = matchesSearch || matchingChildren.length > 0
  
  if (!showNode) return null
  
  // Filter children by search if needed
  const childrenToShow = hasChildren ? (searchQuery ? matchingChildren : node.children) : []
  
  const indentWidth = 24
  const connectorX = level > 0 ? (level - 1) * indentWidth + 11 : 0
  const horizontalConnectorY = 24 // Y position where horizontal connector connects (center of card)
  const cardHeight = 48 // Height of the card
  
  return (
    <div className="flex relative">
      {/* Vertical lines and connectors - positioned in the indent area */}
      {level > 0 && (
        <div className="flex-shrink-0 relative" style={{ width: `${level * indentWidth}px` }}>
          {/* Draw continuous vertical lines for each parent level that isn't last */}
          {parentIsLast.map((parentLast, idx) => {
            if (parentLast) return null // Skip if parent is last
            const parentLevel = idx
            const parentConnectorX = parentLevel * indentWidth + 11
            return (
              <div
                key={`parent-${idx}`}
                className="absolute w-0.5 bg-surface-600"
                style={{
                  left: `${parentConnectorX}px`,
                  top: 0,
                  bottom: 0,
                  zIndex: 0,
                }}
              />
            )
          })}
          
          {/* Continuous vertical line for this level - runs through ALL siblings */}
          {/* Only draw if not the last sibling, so it continues to next sibling */}
          {!isLast && (
            <div 
              className="absolute w-0.5 bg-surface-600"
              style={{ 
                left: `${connectorX}px`,
                top: 0,
                bottom: 0, // Full height to connect all siblings
                zIndex: 0,
              }}
            />
          )}
          
          {/* Vertical line segment from top to horizontal connector */}
          <div 
            className="absolute w-0.5 bg-surface-600"
            style={{ 
              left: `${connectorX}px`,
              top: 0,
              height: `${horizontalConnectorY}px`, // Stop at horizontal connector
              zIndex: 0,
            }}
          />
          
          {/* Horizontal connector line to this node */}
          <div 
            className="absolute h-0.5 bg-surface-600"
            style={{ 
              left: `${connectorX}px`,
              top: `${horizontalConnectorY}px`,
              width: '12px',
              zIndex: 0,
            }}
          />
          
          {/* Vertical line segment after the card - connects to next sibling */}
          {/* Only draw if not the last sibling */}
          {!isLast && (
            <div 
              className="absolute w-0.5 bg-surface-600"
              style={{ 
                left: `${connectorX}px`,
                top: `${cardHeight}px`, // Start after the card
                bottom: 0, // Continue to bottom to connect with next sibling
                zIndex: 0,
              }}
            />
          )}
        </div>
      )}
      
      {/* Node content - positioned above the lines with higher z-index */}
      <div className="flex-1 min-w-0 relative" style={{ zIndex: 10 }}>
        <div 
          className={cn(
            'flex items-center gap-3 py-2 px-3 rounded-lg transition-colors mb-1 relative',
            hasChildren 
              ? 'bg-brand-500/10 border border-brand-500/30' 
              : 'bg-surface-800/40 hover:bg-surface-800/60'
          )}
          style={{ zIndex: 10, position: 'relative' }}
        >
          <div className="flex-1 min-w-0">
            <p className={cn(
              'font-semibold text-sm',
              hasChildren ? 'text-brand-300' : 'text-white'
            )}>
              {node.name}
            </p>
            {node.jobTitle && (
              <p className={cn(
                'text-xs mt-0.5',
                hasChildren ? 'text-brand-200' : 'text-surface-400'
              )}>
                {node.jobTitle}
              </p>
            )}
          </div>
          {hasChildren && (
            <div className="text-xs text-surface-500 font-medium">
              {childrenToShow.length}
            </div>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && childrenToShow.length > 0 && (
          <div className="relative">
            {childrenToShow.map((child, index) => {
              const childIsLast = index === childrenToShow.length - 1
              return (
                <TreeNode 
                  key={child.id} 
                  node={child} 
                  level={level + 1} 
                  searchQuery={searchQuery}
                  isLast={childIsLast}
                  parentIsLast={[...parentIsLast, isLast]}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function OrgChartView({ roots, groupedRoots, canEdit = false }: OrgChartViewProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'cards' | 'tree'>('cards')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [newTeamName, setNewTeamName] = useState('')
  const [showNewTeamInput, setShowNewTeamInput] = useState(false)
  const [draggedNode, setDraggedNode] = useState<OrgUserNode | null>(null)
  const [dragOverNode, setDragOverNode] = useState<string | null>(null)
  const [pendingChange, setPendingChange] = useState<{ userId: string; userName: string; newManagerId: string | null; managerName: string } | null>(null)
  const [showRemoveZone, setShowRemoveZone] = useState(false)
  
  // Build unified hierarchy for tree view (all users in one tree, no team groupings)
  const unifiedTreeRoots = useMemo(() => {
    if (!groupedRoots) return roots ?? []
    
    // First, filter by selected team if not "all"
    let groupsToUse = groupedRoots
    if (selectedTeam !== 'all') {
      groupsToUse = groupedRoots.filter(g => g.team === selectedTeam)
    }
    
    // Flatten all nodes from filtered groups into a single map
    const allNodes = new Map<string, OrgUserNode>()
    
    // Collect all nodes recursively
    const collectNodes = (node: OrgUserNode) => {
      if (!allNodes.has(node.id)) {
        allNodes.set(node.id, { ...node, children: [] })
      }
      node.children.forEach(child => collectNodes(child))
    }
    
    groupsToUse.forEach(group => {
      group.nodes.forEach(root => collectNodes(root))
    })
    
    // Build unified hierarchy based on managerName relationships
    const nodeMap = new Map<string, OrgUserNode>()
    const treeRoots: OrgUserNode[] = []
    
    // Create fresh nodes with empty children
    allNodes.forEach((node, id) => {
      nodeMap.set(id, { ...node, children: [] })
    })
    
    // Build parent-child relationships based on managerName
    allNodes.forEach((node, id) => {
      const unifiedNode = nodeMap.get(id)!
      
      if (node.managerName) {
        // Find manager by name (only if manager is also in our filtered set)
        const manager = Array.from(nodeMap.values()).find(n => 
          n.name === node.managerName && n.id !== id
        )
        
        if (manager) {
          // Add to manager's children
          manager.children.push(unifiedNode)
        } else {
          // Manager not found in filtered dataset, treat as root
          treeRoots.push(unifiedNode)
        }
      } else {
        // No manager, it's a root
        treeRoots.push(unifiedNode)
      }
    })
    
    // Remove nodes from roots that are already children of someone
    const childIds = new Set<string>()
    const markChildren = (node: OrgUserNode) => {
      node.children.forEach(child => {
        childIds.add(child.id)
        markChildren(child)
      })
    }
    treeRoots.forEach(root => markChildren(root))
    
    // Filter out roots that are actually children
    const finalRoots = treeRoots.filter(root => !childIds.has(root.id))
    
    return finalRoots.length > 0 ? finalRoots : (roots ?? [])
  }, [groupedRoots, roots, selectedTeam])
  
  const rootsToRender = groupedRoots?.flatMap((g) => g.nodes) ?? roots ?? []
  if (!rootsToRender.length) return <div className="text-surface-500 text-sm">No org data available</div>

  // Get all unique teams for filter
  const allTeams = useMemo(() => {
    if (!groupedRoots) return []
    return groupedRoots.map(g => g.team)
  }, [groupedRoots])

  // Team options for combobox
  const teamOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Teams' },
      ...allTeams.map(team => ({ value: team, label: team }))
    ]
  }, [allTeams])

  // Handle team selection change
  const handleTeamChange = (value: string) => {
    if (value.startsWith('__new__')) {
      // Create new team
      const teamName = value.replace('__new__', '')
      if (teamName.trim()) {
        handleCreateTeam(teamName)
      }
    } else {
      setSelectedTeam(value)
    }
  }

  // Create new team
  const handleCreateTeam = async (teamName: string) => {
    if (!teamName.trim()) {
      toast.error('Team name cannot be empty')
      return
    }
    
    // For now, just show a message - in a real implementation, you'd call an API
    toast.success(`Team "${teamName}" would be created (API integration needed)`)
    setNewTeamName('')
    setShowNewTeamInput(false)
    // Note: In a real implementation, you'd refresh the data or update state
  }

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, node: OrgUserNode) => {
    if (!canEdit) return
    setDraggedNode(node)
    setShowRemoveZone(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.id)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedNode(null)
    setDragOverNode(null)
    setShowRemoveZone(false)
  }

  // Handle drag over - only allow on manager cards or remove zone
  const handleDragOver = (e: React.DragEvent, nodeId: string, isManager: boolean = false) => {
    if (!canEdit || !draggedNode) return
    
    // Only allow dropping on managers (or remove zone)
    if (!isManager && nodeId !== 'remove-zone') {
      return
    }
    
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverNode(nodeId)
  }

  // Handle drop - show confirmation first
  const handleDrop = (e: React.DragEvent, targetNodeId: string, targetName: string) => {
    if (!canEdit || !draggedNode) return
    e.preventDefault()
    
    // Prevent dropping on self
    if (draggedNode.id === targetNodeId) {
      handleDragEnd()
      return
    }

    // Show confirmation dialog
    setPendingChange({
      userId: draggedNode.id,
      userName: draggedNode.name,
      newManagerId: targetNodeId,
      managerName: targetName
    })
    handleDragEnd()
  }

  // Handle remove manager drop
  const handleRemoveDrop = (e: React.DragEvent) => {
    if (!canEdit || !draggedNode) return
    e.preventDefault()
    
    setPendingChange({
      userId: draggedNode.id,
      userName: draggedNode.name,
      newManagerId: null,
      managerName: 'No Manager'
    })
    handleDragEnd()
  }

  // Confirm and apply the change
  const confirmChange = async () => {
    if (!pendingChange) return

    try {
      // If assigning a manager, fetch the manager's team to update the person's team
      let updateData: any = { managerId: pendingChange.newManagerId }
      let teamUpdated = false
      let newTeam = null
      
      if (pendingChange.newManagerId && canEdit) {
        // Fetch manager's team information
        const managerRes = await fetch(`/api/users/${pendingChange.newManagerId}`)
        if (managerRes.ok) {
          const manager = await managerRes.json()
          console.log('Manager data:', { id: manager.id, name: manager.name, team: manager.team, jobTitle: manager.jobTitle })
          
          // If manager has a team, update the person's team to match
          if (manager.team) {
            // Get current user's team to merge if needed
            const userRes = await fetch(`/api/users/${pendingChange.userId}`)
            if (userRes.ok) {
              const user = await userRes.json()
              console.log('Current user data:', { id: user.id, name: user.name, team: user.team, jobTitle: user.jobTitle })
              
              const currentTeams = (user.team || '').split(',').map((t: string) => t.trim()).filter(Boolean)
              const managerTeams = (manager.team || '').split(',').map((t: string) => t.trim()).filter(Boolean)
              
              console.log('Current teams:', currentTeams)
              console.log('Manager teams:', managerTeams)
              
              // Find consultant team in manager's teams
              const consultantTeamMatch = managerTeams.find((t: string) => 
                /consultant\s*team\s*\d/i.test(t)
              )
              
              if (consultantTeamMatch) {
                // If person is in "Other" or has no team, replace with consultant team
                if (currentTeams.length === 0 || currentTeams.some((t: string) => t.toLowerCase() === 'other')) {
                  newTeam = consultantTeamMatch
                  teamUpdated = true
                } else if (!currentTeams.some((t: string) => t === consultantTeamMatch)) {
                  // Add the consultant team if not already present, remove "Other"
                  const filteredTeams = currentTeams.filter((t: string) => t.toLowerCase() !== 'other')
                  newTeam = [...filteredTeams, consultantTeamMatch].join(', ')
                  teamUpdated = true
                }
              } else if (managerTeams.length > 0) {
                // For other teams, merge them (but remove "Other" if present)
                const filteredCurrent = currentTeams.filter((t: string) => t.toLowerCase() !== 'other')
                const allTeams = Array.from(new Set([...filteredCurrent, ...managerTeams]))
                if (allTeams.length > filteredCurrent.length || currentTeams.some((t: string) => t.toLowerCase() === 'other')) {
                  newTeam = allTeams.join(', ')
                  teamUpdated = true
                }
              }
              
              if (teamUpdated && newTeam) {
                updateData.team = newTeam
                console.log('Updating team to:', newTeam)
              } else {
                console.log('Team not updated - no changes needed or no team match')
              }
            } else {
              console.error('Failed to fetch current user:', userRes.status)
              // If we can't get current user, just use manager's team
              updateData.team = manager.team
              teamUpdated = true
              newTeam = manager.team
              console.log('Using manager team directly:', manager.team)
            }
          } else {
            console.log('Manager has no team field')
          }
        } else {
          console.error('Failed to fetch manager:', managerRes.status, await managerRes.text())
        }
      } else {
        console.log('Not updating team - canEdit:', canEdit, 'hasManagerId:', !!pendingChange.newManagerId)
      }

      console.log('Update data:', updateData)

      const res = await fetch(`/api/users/${pendingChange.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        const data = await res.json()
        console.error('Update failed:', data)
        throw new Error(data.error || 'Failed to update manager')
      }

      const updatedUser = await res.json()
      console.log('Updated user:', updatedUser)

      const action = pendingChange.newManagerId 
        ? `Moved ${pendingChange.userName} to report to ${pendingChange.managerName}${teamUpdated ? ` and updated their team to ${newTeam}` : ''}`
        : `Removed ${pendingChange.userName}'s manager`
      
      toast.success(action)
      
      // Refresh the data without full page reload
      router.refresh()
    } catch (error: any) {
      console.error('Error updating manager:', error)
      toast.error(error.message || 'Failed to update manager relationship')
    } finally {
      setPendingChange(null)
    }
  }

  // Cancel pending change
  const cancelChange = () => {
    setPendingChange(null)
  }

  // Remove manager directly (button click)
  const handleRemoveManager = async (userId: string, userName: string) => {
    if (!canEdit) return
    
    setPendingChange({
      userId,
      userName,
      newManagerId: null,
      managerName: 'No Manager'
    })
  }

  // Handle duplicate (add to another team)
  const handleDuplicate = async (node: OrgUserNode, targetTeam: string) => {
    if (!canEdit) return
    
    // For now, this would require backend support to handle "virtual" duplicates
    // In a real implementation, you might create a relationship or flag
    toast.info(`Duplicating ${node.name} to ${targetTeam} (API integration needed)`)
  }

  // Filter grouped roots by team
  const filteredGroupedRoots = useMemo(() => {
    if (!groupedRoots) return []
    let filtered = groupedRoots
    
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(g => g.team === selectedTeam)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.map(group => ({
        ...group,
        nodes: group.nodes.filter(node => {
          const matches = node.name.toLowerCase().includes(query) ||
            node.jobTitle?.toLowerCase().includes(query) ||
            node.team?.toLowerCase().includes(query)
          
          // Also include if any children match
          if (!matches && node.children.length > 0) {
            return node.children.some(child => 
              child.name.toLowerCase().includes(query) ||
              child.jobTitle?.toLowerCase().includes(query) ||
              child.team?.toLowerCase().includes(query)
            )
          }
          
          return matches
        })
      })).filter(group => group.nodes.length > 0)
    }
    
    return filtered
  }, [groupedRoots, selectedTeam, searchQuery])

  if (groupedRoots && groupedRoots.length > 0) {
    return (
      <div className="space-y-6">
        {/* Confirmation Dialog */}
        {pendingChange && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
            <div className="bg-surface-900 border border-surface-700 rounded-lg p-6 max-w-md w-full shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Confirm Manager Change</h3>
                  <p className="text-sm text-surface-400">
                    {pendingChange.newManagerId 
                      ? `Are you sure you want to move ${pendingChange.userName} to report to ${pendingChange.managerName}?`
                      : `Are you sure you want to remove ${pendingChange.userName}'s manager?`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmChange}
                  className="btn-primary flex-1"
                >
                  Confirm
                </button>
                <button
                  onClick={cancelChange}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Manager Drop Zone */}
        {showRemoveZone && draggedNode && canEdit && (
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverNode('remove-zone')
            }}
            onDrop={handleRemoveDrop}
            className={cn(
              'card p-6 border-2 border-dashed transition-all text-center',
              dragOverNode === 'remove-zone'
                ? 'border-red-500 bg-red-500/10'
                : 'border-surface-700 bg-surface-800/60'
            )}
          >
            <X className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-sm text-surface-400">
              Drop here to <span className="text-red-400 font-medium">remove manager</span>
            </p>
            <p className="text-xs text-surface-500 mt-1">
              Dragging: {draggedNode.name}
            </p>
          </div>
        )}

        {/* Search and Filter Controls */}
        <div className="card p-4 bg-surface-900/50 border-surface-700 relative z-50 overflow-visible">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search by name, title, or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            
            {/* Team Filter - Combobox */}
            <div className="relative z-[100] overflow-visible w-full sm:w-64">
              <Combobox
                options={teamOptions}
                value={selectedTeam}
                onChange={handleTeamChange}
                placeholder="Filter by team..."
                searchable={true}
                allowClear={false}
                className="w-full"
              />
            </div>
            
            {/* View Toggle and Create Team Button */}
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={() => setShowNewTeamInput(!showNewTeamInput)}
                  className={cn(
                    'px-4 py-2 rounded-lg border transition-colors flex items-center gap-2',
                    showNewTeamInput
                      ? 'bg-brand-500/20 border-brand-500/30 text-brand-300'
                      : 'bg-surface-800 border-surface-700 text-surface-400 hover:bg-surface-700'
                  )}
                  title="Create new team"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">New Team</span>
                </button>
              )}
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  'px-4 py-2 rounded-lg border transition-colors',
                  viewMode === 'cards'
                    ? 'bg-brand-500/20 border-brand-500/30 text-brand-300'
                    : 'bg-surface-800 border-surface-700 text-surface-400 hover:bg-surface-700'
                )}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  'px-4 py-2 rounded-lg border transition-colors',
                  viewMode === 'tree'
                    ? 'bg-brand-500/20 border-brand-500/30 text-brand-300'
                    : 'bg-surface-800 border-surface-700 text-surface-400 hover:bg-surface-700'
                )}
              >
                <GitBranch className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Create New Team Input */}
        {canEdit && showNewTeamInput && (
          <div className="card p-4 bg-surface-900/50 border-surface-700 border-brand-500/30">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">Create New Team</p>
              <button
                onClick={() => {
                  setShowNewTeamInput(false)
                  setNewTeamName('')
                }}
                className="p-1 text-surface-400 hover:text-surface-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter team name..."
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTeamName.trim()) {
                    handleCreateTeam(newTeamName.trim())
                  } else if (e.key === 'Escape') {
                    setShowNewTeamInput(false)
                    setNewTeamName('')
                  }
                }}
                className="input flex-1"
                autoFocus
              />
              <button
                onClick={() => {
                  if (newTeamName.trim()) {
                    handleCreateTeam(newTeamName.trim())
                  }
                }}
                className="btn-primary px-4 py-2.5 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
          </div>
        )}

        {/* Tree View - Unified Company Hierarchy */}
        {viewMode === 'tree' && (
          <div className="card p-6 bg-surface-900/50 border-surface-700">
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-surface-700">
              <div className="p-3 rounded-lg bg-brand-500/20 border border-brand-500/30">
                <Users className="w-6 h-6 text-brand-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {selectedTeam !== 'all' ? `${selectedTeam} Hierarchy` : 'Company Hierarchy'}
                </h2>
                <p className="text-sm text-surface-400 mt-0.5">
                  {selectedTeam !== 'all' 
                    ? `Organizational structure for ${selectedTeam}`
                    : 'Full organizational structure'}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {unifiedTreeRoots
                .filter(root => {
                  // Filter by search query (TreeNode component also handles this internally)
                  if (!searchQuery) return true
                  const query = searchQuery.toLowerCase()
                  const matches = root.name.toLowerCase().includes(query) ||
                    root.jobTitle?.toLowerCase().includes(query) ||
                    root.team?.toLowerCase().includes(query)
                  
                  // Also include if any children match (recursively)
                  const hasMatchingDescendant = (node: OrgUserNode): boolean => {
                    if (node.name.toLowerCase().includes(query) ||
                        node.jobTitle?.toLowerCase().includes(query) ||
                        node.team?.toLowerCase().includes(query)) {
                      return true
                    }
                    return node.children.some(child => hasMatchingDescendant(child))
                  }
                  
                  return matches || hasMatchingDescendant(root)
                })
                .map((root, index, array) => {
                  const isLast = index === array.length - 1
                  return (
                    <TreeNode 
                      key={root.id} 
                      node={root} 
                      searchQuery={searchQuery}
                      isLast={isLast}
                      parentIsLast={[]}
                    />
                  )
                })}
            </div>
          </div>
        )}

        {/* Card View */}
        {viewMode === 'cards' && (
          <div className="space-y-6">
            {filteredGroupedRoots.map((group) => {
              // Find managers: those with children OR those with manager job titles
              const managers = group.nodes.filter(n => {
                const hasChildren = n.children.length > 0
                const isManagerByTitle = n.jobTitle?.toLowerCase().includes('manager') || 
                                       n.jobTitle?.toLowerCase().includes('director') ||
                                       ['ceo', 'cto', 'coo', 'cfo', 'cpo'].some(title => 
                                         n.jobTitle?.toLowerCase().includes(title)
                                       )
                return hasChildren || isManagerByTitle
              })
              const teamMembers = group.nodes.filter(n => !managers.includes(n))

              const TeamIcon = getTeamIcon(group.team)

              return (
                <div key={group.team} className="card p-6 bg-surface-900/50 border-surface-700">
                  {/* Team Header Card - Large with icon on left */}
                  <div className="flex items-center gap-4 mb-6 pb-4 border-b border-surface-700">
                    <div className="p-3 rounded-lg bg-brand-500/20 border border-brand-500/30">
                      <TeamIcon className="w-6 h-6 text-brand-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{group.team}</h2>
                      <p className="text-sm text-surface-400 mt-0.5">
                        {managers.length + teamMembers.length} {managers.length + teamMembers.length === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Managers Section */}
                    {managers.map((manager) => (
                      <div key={manager.id} className="space-y-4">
                        {/* Manager Card */}
                        <PersonCard 
                          node={manager} 
                          isManager={true}
                          canEdit={canEdit}
                          isDragging={draggedNode?.id === manager.id}
                          isDragOver={dragOverNode === manager.id}
                          hasManager={!!manager.managerName}
                          onDragStart={handleDragStart}
                          onDragOver={(e, nodeId) => handleDragOver(e, nodeId, true)}
                          onDrop={(e, nodeId) => handleDrop(e, nodeId, manager.name)}
                          onDragEnd={handleDragEnd}
                          onRemoveManager={handleRemoveManager}
                          onDuplicate={(node) => handleDuplicate(node, group.team)}
                        />
                        
                        {/* Visual Connector Line */}
                        {manager.children.length > 0 && (
                          <>
                            <div className="flex items-center">
                              <div className="w-0.5 h-6 bg-surface-700 ml-6"></div>
                            </div>
                            {/* Team Members Grid */}
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {manager.children.map((member) => (
                                <PersonCard 
                                  key={member.id} 
                                  node={member}
                                  canEdit={canEdit}
                                  isDragging={draggedNode?.id === member.id}
                                  isDragOver={dragOverNode === member.id}
                                  hasManager={!!member.managerName}
                                  onDragStart={handleDragStart}
                                  onDragOver={(e, nodeId) => handleDragOver(e, nodeId, false)}
                                  onDrop={(e, nodeId) => handleDrop(e, nodeId, member.name)}
                                  onDragEnd={handleDragEnd}
                                  onRemoveManager={handleRemoveManager}
                                  onDuplicate={(node) => handleDuplicate(node, group.team)}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Team Members without managers */}
                    {teamMembers.length > 0 && managers.length === 0 && (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {teamMembers.map((member) => (
                          <PersonCard 
                            key={member.id} 
                            node={member}
                            canEdit={canEdit}
                            isDragging={draggedNode?.id === member.id}
                            isDragOver={dragOverNode === member.id}
                            hasManager={!!member.managerName}
                            onDragStart={handleDragStart}
                            onDragOver={(e, nodeId) => handleDragOver(e, nodeId, false)}
                            onDrop={(e, nodeId) => handleDrop(e, nodeId, member.name)}
                            onDragEnd={handleDragEnd}
                            onRemoveManager={handleRemoveManager}
                            onDuplicate={(node) => handleDuplicate(node, group.team)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Fallback for non-grouped view
  return (
    <div className="space-y-4">
      {/* Confirmation Dialog */}
      {pendingChange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">Confirm Manager Change</h3>
                <p className="text-sm text-surface-400">
                  {pendingChange.newManagerId 
                    ? `Are you sure you want to move ${pendingChange.userName} to report to ${pendingChange.managerName}?`
                    : `Are you sure you want to remove ${pendingChange.userName}'s manager?`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmChange}
                className="btn-primary flex-1"
              >
                Confirm
              </button>
              <button
                onClick={cancelChange}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {(roots ?? []).map((root) => (
          <div key={root.id} className="space-y-3">
            <PersonCard 
              node={root}
              canEdit={canEdit}
              isDragging={draggedNode?.id === root.id}
              isDragOver={dragOverNode === root.id}
              hasManager={!!root.managerName}
              onDragStart={handleDragStart}
              onDragOver={(e, nodeId) => handleDragOver(e, nodeId, root.children.length > 0)}
              onDrop={(e, nodeId) => handleDrop(e, nodeId, root.name)}
              onDragEnd={handleDragEnd}
              onRemoveManager={handleRemoveManager}
            />
            {root.children.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3 pl-4">
                {root.children.map((child) => (
                  <PersonCard 
                    key={child.id} 
                    node={child}
                    canEdit={canEdit}
                    isDragging={draggedNode?.id === child.id}
                    isDragOver={dragOverNode === child.id}
                    hasManager={!!child.managerName}
                    onDragStart={handleDragStart}
                    onDragOver={(e, nodeId) => handleDragOver(e, nodeId, false)}
                    onDrop={(e, nodeId) => handleDrop(e, nodeId, child.name)}
                    onDragEnd={handleDragEnd}
                    onRemoveManager={handleRemoveManager}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
