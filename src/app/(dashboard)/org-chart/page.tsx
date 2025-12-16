import { Header } from '@/components/layout/header'
import { OrgChartView, OrgUserNode } from '@/components/org-chart/org-chart-view'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const BUCKET_ORDER = [
  'Consultant Team 1',
  'Consultant Team 2',
  'Consultant Team 3',
  'Consultant Team 4',
  'Consultant Team 5',
  'Consultant Team 6',
  'Consultant Team 7',
  'IT Managers',
  'C Suite',
  'System Engineers',
  'Network Engineers',
  'Software Engineers',
  'GRC Engineers',
  'Facilities',
  'Other',
]

function getBucket(jobTitle: string | null, team: string | null): string {
  const title = jobTitle?.toLowerCase() || ''
  const teams = (team || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  const teamStr = teams.join(' ').toLowerCase()

  // C Suite / Directors - but they can also appear in teams they manage
  // Use word boundaries to avoid false positives (e.g., "coordinator" contains "coo" but shouldn't match)
  const cLevelPatterns = [
    /\bceo\b/,
    /\bcto\b/,
    /\bcoo\b/,
    /\bcfo\b/,
    /\bcpo\b/,
    /\bchief\s+(executive|technology|operating|financial|product|officer)/i,
    /\bc-suite\b/,
    /\bc suite\b/,
  ]
  const isCLevel = cLevelPatterns.some((pattern) => pattern.test(title)) ||
    /\bdirector\b/.test(title)

  // Managers go to their respective teams
  if (title.includes('se manager') || title.includes('systems engineering manager')) {
    return 'System Engineers'
  }
  if (title.includes('grc manager')) {
    return 'GRC Engineers'
  }
  if (title.includes('software engineering manager') || title.includes('software engineer manager') || 
      (title.includes('software engineer') && teamStr.includes('software engineering') && title.includes('manager'))) {
    return 'Software Engineers'
  }
  // IT Managers always go to IT Managers bucket (they can also appear in Consultant Teams via manager relationships)
  if (title.includes('it manager')) {
    return 'IT Managers'
  }
  // Operations Manager with ITM Team should go to IT Managers
  if (title.includes('operations manager') && (teamStr.includes('itm') || teamStr.includes('it manager'))) {
    return 'IT Managers'
  }
  // C-level executives: check if they manage specific teams
  if (isCLevel) {
    // CTO managing Network Engineering
    if (title.includes('cto') && (teamStr.includes('network engineering') || teamStr.includes('network engineer'))) {
      // Will be in both C Suite and Network Engineers
    }
    // COO managing IT Managers / ITM Team
    if (title.includes('coo') && (teamStr.includes('itm') || teamStr.includes('it manager'))) {
      // Will be in both C Suite and IT Managers
    }
    return 'C Suite'
  }

  // Engineers (but not managers) - check these BEFORE consultant teams
  if ((title.includes('system engineer') || title.includes('systems engineer')) && !title.includes('manager')) {
    return 'System Engineers'
  }
  if (title.includes('network engineer') && !title.includes('manager')) {
    return 'Network Engineers'
  }
  if ((title.includes('software engineer') || teamStr.includes('software engineering')) && !title.includes('manager')) {
    return 'Software Engineers'
  }
  if (title.includes('grc') && title.includes('engineer') && !title.includes('manager')) {
    return 'GRC Engineers'
  }

  // Consultants by team number (check both job title and team field)
  // First, check if team field contains a consultant team number (but only if not already classified as engineer/manager)
  const teamMatch = (team || '').match(/consultant\s*team\s*(\d)/i)
  if (teamMatch) {
    return `Consultant Team ${teamMatch[1]}`
  }
  // Also check the joined team string
  const teamStrMatch = teamStr.match(/consultant\s*team\s*(\d)/i)
  if (teamStrMatch) {
    return `Consultant Team ${teamStrMatch[1]}`
  }
  
  // If job title indicates consultant, check for team number in various places
  if ((title.includes('consultant') || title.includes('it consultant')) && !title.includes('manager')) {
    // Check job title for team number
    const titleMatch = title.match(/consultant\s*(?:team\s*)?(\d)/i)
    if (titleMatch) {
      return `Consultant Team ${titleMatch[1]}`
    }
    // Check team string for any team number pattern (but only if it's clearly a consultant team)
    const teamNumMatch = teamStr.match(/team\s*(\d)/i)
    if (teamNumMatch && (teamStr.includes('consultant') || (team || '').toLowerCase().includes('consultant'))) {
      return `Consultant Team ${teamNumMatch[1]}`
    }
    // If they have a team field that mentions consultant but no number, try to infer
    if (teamStr.includes('consultant') || (team || '').includes('consultant')) {
      // Try to find any number in the team string
      const anyNumMatch = (team || teamStr).match(/(\d)/)
      if (anyNumMatch) {
        return `Consultant Team ${anyNumMatch[1]}`
      }
    }
    // Don't default to Consultant Team 1 - if we can't find a team number, they should go to "Other"
    // This prevents consultants without a specific team assignment from being incorrectly grouped
  }

  // Facilities - check team field and job title
  if (
    teamStr.includes('facilities') || 
    title.includes('facilities') ||
    (team && team.toLowerCase().includes('facilities'))
  ) {
    return 'Facilities'
  }

  return 'Other'
}

function filterTreeByBucket(node: OrgUserNode, bucket: string, bucketForId: Map<string, string>): OrgUserNode | null {
  const nodeBucket = bucketForId.get(node.id)
  if (nodeBucket !== bucket) return null

  const filteredChildren = node.children
    .map((child) => filterTreeByBucket(child, bucket, bucketForId))
    .filter(Boolean) as OrgUserNode[]

  return { ...node, children: filteredChildren }
}

export default async function OrgChartPage() {
  const users = await db.user.findMany({
    where: {
      email: {
        not: null,
      },
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      jobTitle: true,
      team: true,
      managerId: true,
        User: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Determine bucket for each user
  const bucketForId = new Map<string, string>()
  users.forEach((u) => {
    bucketForId.set(u.id, getBucket(u.jobTitle, u.team))
  })

  // Build fresh node map (without children yet)
  const nodeData = new Map<string, Omit<OrgUserNode, 'children'>>()
  users.forEach((u) => {
    nodeData.set(u.id, {
      id: u.id,
      name: u.name ?? 'Unknown',
      jobTitle: u.jobTitle,
      team: u.team,
      managerName: u.User?.name ?? null,
    })
  })

  // Build per-bucket forests from scratch:
  // - Create fresh node copies for each bucket
  // - If a user's manager is in the same bucket, nest under that manager
  // - Otherwise, they become a root within that bucket
  const groups = new Map<string, OrgUserNode[]>()
  const nodesInBucket = new Map<string, OrgUserNode>() // Track nodes we've created per bucket
  
  const createNode = (userId: string, bucket: string): OrgUserNode => {
    const key = `${bucket}:${userId}`
    if (nodesInBucket.has(key)) {
      return nodesInBucket.get(key)!
    }
    
    const data = nodeData.get(userId)!
    const node: OrgUserNode = {
      ...data,
      children: [],
    }
    nodesInBucket.set(key, node)
    return node
  }

  const addRoot = (bucket: string, node: OrgUserNode) => {
    if (!groups.has(bucket)) groups.set(bucket, [])
    groups.get(bucket)!.push(node)
  }

  const shouldBeInBucket = (userId: string, bucket: string): boolean => {
    const u = users.find(usr => usr.id === userId)
    if (!u) return false
    
    const primaryBucket = bucketForId.get(userId) || 'Other'
    if (primaryBucket === bucket) return true
    
    const title = u.jobTitle?.toLowerCase() || ''
    const teamStr = (u.team || '').toLowerCase()
    
    // IT Managers should also be in their Consultant Team bucket
    if (title.includes('it manager') && primaryBucket === 'IT Managers') {
      const match = (u.team || '').match(/consultant\s*team\s*(\d)/i)
      if (match && bucket === `Consultant Team ${match[1]}`) {
        return true
      }
      // IT Managers should also be in Facilities if they manage it
      if (teamStr.includes('facilities') && bucket === 'Facilities') {
        return true
      }
    }
    
    // C-level executives should also be in teams they manage
    const isCLevel = ['ceo', 'cto', 'coo', 'cfo', 'cpo', 'chief'].some((k) => title.includes(k))
    if (isCLevel && primaryBucket === 'C Suite') {
      // CTO managing Network Engineering
      if (title.includes('cto') && bucket === 'Network Engineers' && 
          (teamStr.includes('network engineering') || teamStr.includes('network engineer'))) {
        return true
      }
      // COO managing IT Managers / ITM Team
      if (title.includes('coo') && bucket === 'IT Managers' && 
          (teamStr.includes('itm') || teamStr.includes('it manager'))) {
        return true
      }
    }
    
    return false
  }

  const placeUserInBucket = (userId: string, bucket: string) => {
    if (!BUCKET_ORDER.includes(bucket)) return

    const u = users.find(usr => usr.id === userId)
    if (!u) return

    // Create fresh node for this bucket
    const node = createNode(userId, bucket)

    // Find nearest ancestor in same bucket
    let parentId = u.managerId
    let placed = false
    
    // For Facilities, ALWAYS check direct manager first and use them if they're IT Manager with Facilities
    // This prevents walking up to C-level executives
    if (bucket === 'Facilities' && parentId) {
      const directManager = users.find(usr => usr.id === parentId)
      if (directManager) {
        const managerTitle = directManager.jobTitle?.toLowerCase() || ''
        const managerTeam = (directManager.team || '').toLowerCase()
        // If direct manager is IT Manager with Facilities in team, use them directly
        if (managerTitle.includes('it manager') && managerTeam.includes('facilities')) {
          const parentNode = createNode(directManager.id, bucket)
          parentNode.children.push(node)
          placed = true
        }
      }
    }
    
    // If not placed yet, walk up the manager chain (for other buckets or if direct manager check failed)
    // BUT for Facilities, NEVER walk up past the direct manager - if direct manager isn't IT Manager with Facilities,
    // just make them a root in Facilities
    if (!placed && bucket !== 'Facilities') {
      while (parentId) {
        // Check if parent should be in this bucket (primary or secondary)
        if (shouldBeInBucket(parentId, bucket)) {
          const parentNode = createNode(parentId, bucket)
          parentNode.children.push(node)
          placed = true
          break
        }
        const parentUser = users.find((usr) => usr.id === parentId)
        parentId = parentUser?.managerId || null
      }
    }

    // If not placed and this is a Consultant Team, try to find an IT Manager in the same team
    if (!placed && bucket.startsWith('Consultant Team ')) {
      const title = u.jobTitle?.toLowerCase() || ''
      // Only auto-nest consultants (not IT Managers themselves)
      if ((title.includes('consultant') || title.includes('it consultant')) && !title.includes('manager')) {
        // Find IT Manager in the same Consultant Team
        const itManager = users.find((usr) => {
          const usrTitle = usr.jobTitle?.toLowerCase() || ''
          const usrTeam = usr.team || ''
          return (
            usrTitle.includes('it manager') &&
            shouldBeInBucket(usr.id, bucket) &&
            usr.id !== userId // Don't nest under self
          )
        })
        
        if (itManager) {
          const parentNode = createNode(itManager.id, bucket)
          parentNode.children.push(node)
          placed = true
        }
      }
    }

    // If not placed and this is Facilities, try to find an IT Manager who manages Facilities
    if (!placed && bucket === 'Facilities') {
      const title = u.jobTitle?.toLowerCase() || ''
      // Auto-nest Facilities team members (coordinators, etc.) under their IT Manager
      // Check if they have a managerId first, and if that manager should be in Facilities
      if (u.managerId) {
        const manager = users.find(usr => usr.id === u.managerId)
        if (manager) {
          const managerTitle = manager.jobTitle?.toLowerCase() || ''
          const managerTeam = (manager.team || '').toLowerCase()
          // Check if manager is IT Manager with Facilities in team - use them directly, don't check shouldBeInBucket
          // because we know they should be in Facilities if they have it in their team
          if (managerTitle.includes('it manager') && managerTeam.includes('facilities')) {
            const parentNode = createNode(manager.id, bucket)
            parentNode.children.push(node)
            placed = true
          }
        }
      }
      
      // Fallback: If still not placed, find any IT Manager who manages Facilities
      if (!placed && (title.includes('facilities') || title.includes('coordinator')) && !title.includes('manager')) {
        const itManager = users.find((usr) => {
          const usrTitle = usr.jobTitle?.toLowerCase() || ''
          const usrTeam = (usr.team || '').toLowerCase()
          return (
            usrTitle.includes('it manager') &&
            usrTeam.includes('facilities') &&
            usr.id !== userId // Don't nest under self
          )
        })
        
        if (itManager) {
          const parentNode = createNode(itManager.id, bucket)
          parentNode.children.push(node)
          placed = true
        }
      }
    }

    if (!placed) {
      addRoot(bucket, node)
    }
  }

  // First pass: Process IT Managers and C-level executives, add them to their managed teams
  // This ensures they're in the right buckets before we process their team members
  users.forEach((u) => {
    const primaryBucket = bucketForId.get(u.id) || 'Other'
    const title = u.jobTitle?.toLowerCase() || ''
    const teamStr = (u.team || '').toLowerCase()
    
    // IT Managers should ALSO appear in their Consultant Team if they manage one
    if (title.includes('it manager') && primaryBucket === 'IT Managers') {
      // Check if they have a consultant team
      const match = (u.team || '').match(/consultant\s*team\s*(\d)/i)
      if (match) {
        const consultantTeam = `Consultant Team ${match[1]}`
        // Place them in their Consultant Team bucket FIRST
        placeUserInBucket(u.id, consultantTeam)
      }
      
      // IT Managers should ALSO appear in Facilities if they manage it
      if (teamStr.includes('facilities')) {
        placeUserInBucket(u.id, 'Facilities')
      }
    }
    
    // C-level executives should ALSO appear in teams they manage
    const isCLevel = ['ceo', 'cto', 'coo', 'cfo', 'cpo', 'chief'].some((k) => title.includes(k))
    if (isCLevel && primaryBucket === 'C Suite') {
      // CTO managing Network Engineering
      if (title.includes('cto') && (teamStr.includes('network engineering') || teamStr.includes('network engineer'))) {
        placeUserInBucket(u.id, 'Network Engineers')
      }
      // COO managing IT Managers / ITM Team
      if (title.includes('coo') && (teamStr.includes('itm') || teamStr.includes('it manager'))) {
        placeUserInBucket(u.id, 'IT Managers')
      }
    }
  })

  // Second pass: Place all users in their primary buckets
  // This includes consultants, who will now find their IT Managers already in Consultant Team buckets
  users.forEach((u) => {
    const primaryBucket = bucketForId.get(u.id) || 'Other'
    placeUserInBucket(u.id, primaryBucket)
  })

  const groupedRoots = BUCKET_ORDER
    .filter((b) => groups.has(b))
    .map((bucket) => ({
      team: bucket,
      nodes: groups.get(bucket)!,
    }))

  const session = await auth()
  const userRole = session?.user?.role
  const canEdit = hasPermission(userRole, 'org_chart:edit')
  const canView = hasPermission(userRole, 'org_chart:view')

  // If user doesn't have view permission, they shouldn't access this page
  // (This would typically be handled by middleware, but adding a check here too)
  if (!canView) {
    return (
      <>
        <Header title="Org Chart" />
        <div className="p-6">
          <div className="card p-6 text-center">
            <p className="text-surface-400">You don't have permission to view the org chart.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Org Chart" />
      <div className="p-6 space-y-6">
        <OrgChartView groupedRoots={groupedRoots} canEdit={canEdit} />
      </div>
    </>
  )
}
