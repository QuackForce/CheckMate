import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

const NOTION_API_KEY = process.env.NOTION_API_KEY || ''
const TEAM_MEMBERS_DB = process.env.NOTION_TEAM_MEMBERS_DATABASE_ID || ''

interface NotionTeamMember {
  id: string
  name: string
  email: string | null
  jobTitle: string | null
  team: string | null
}

/**
 * Fetch all team members from Notion
 */
async function fetchNotionTeamMembers(): Promise<NotionTeamMember[]> {
  if (!TEAM_MEMBERS_DB) {
    throw new Error('NOTION_TEAM_MEMBERS_DATABASE_ID not configured')
  }

  const members: NotionTeamMember[] = []
  let hasMore = true
  let nextCursor: string | null = null

  while (hasMore) {
    const body: any = { page_size: 100 }
    if (nextCursor) {
      body.start_cursor = nextCursor
    }

    const response = await fetch(
      `https://api.notion.com/v1/databases/${TEAM_MEMBERS_DB}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Notion API error: ${error.message}`)
    }

    const data = await response.json()
    
    for (const page of data.results) {
      const props = page.properties
      
      // Get name - try Title field first, then Name
      let name = ''
      if (props.Title?.title?.[0]?.plain_text) {
        name = props.Title.title[0].plain_text
      } else if (props.Name?.title?.[0]?.plain_text) {
        name = props.Name.title[0].plain_text
      } else if (props.name?.title?.[0]?.plain_text) {
        name = props.name.title[0].plain_text
      }
      
      // Get email - support multiple possible fields
      let email: string | null = null

      // 1) Direct Email property (Notion \"Email\" type)
      if (props.Email?.email) {
        email = props.Email.email
      } else if (props.email?.email) {
        email = props.email.email
      }

      // 2) \"Contact Email\" column (could be email or rich_text)
      if (!email) {
        const contactEmailProp = (props as any)['Contact Email'] || (props as any)['contact email']
        if (contactEmailProp?.email) {
          email = contactEmailProp.email
        } else if (contactEmailProp?.rich_text?.[0]?.plain_text) {
          email = contactEmailProp.rich_text[0].plain_text
        }
      }

      // 3) Fallback: rich_text content in Email property
      if (!email && props.Email?.rich_text?.[0]?.plain_text) {
        email = props.Email.rich_text[0].plain_text
      }

      // Get jobTitle - try various property names
      let jobTitle: string | null = null
      const jobTitleProps = [
        'Title',
        'Job Title',
        'JobTitle',
        'Role',
        'Position',
        'title',
        'jobTitle',
        'role',
        'position',
      ]
      for (const propName of jobTitleProps) {
        const prop = (props as any)[propName]
        if (prop?.select?.name) {
          jobTitle = prop.select.name
          break
        } else if (prop?.rich_text?.[0]?.plain_text) {
          jobTitle = prop.rich_text[0].plain_text
          break
        } else if (prop?.title?.[0]?.plain_text && propName === 'Title') {
          // Skip if this is the name field
          continue
        }
      }

      // Get team - try various property names (could be multi-select)
      let team: string | null = null
      const teamProps = [
        'Team',
        'Teams',
        'Team(s)',
        'team',
        'teams',
      ]
      for (const propName of teamProps) {
        const prop = (props as any)[propName]
        if (prop?.multi_select && prop.multi_select.length > 0) {
          // Multi-select: join with commas
          team = prop.multi_select.map((item: any) => item.name).join(', ')
          break
        } else if (prop?.select?.name) {
          team = prop.select.name
          break
        } else if (prop?.rich_text?.[0]?.plain_text) {
          team = prop.rich_text[0].plain_text
          break
        }
      }
      
      // Exclude placeholder accounts
      if (name && name.trim() !== 'JIT - New Member') {
        members.push({
          id: page.id,
          name,
          email,
          jobTitle: jobTitle || null,
          team: team || null,
        })
      }
    }

    hasMore = data.has_more
    nextCursor = data.next_cursor
  }

  return members
}

// POST /api/users/sync-notion - Sync users from Notion team members
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const notionMembers = await fetchNotionTeamMembers()

    // Get existing users
    const existingUsers = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        notionTeamMemberId: true,
      }
    })

    const results = {
      total: notionMembers.length,
      linked: 0,
      created: 0,
      skipped: 0,
      details: [] as any[]
    }

    for (const member of notionMembers) {
      // Check if already linked by Notion ID
      const linkedByNotion = existingUsers.find(u => u.notionTeamMemberId === member.id)
      if (linkedByNotion) {
        // Already linked - update name, email, jobTitle, and team from Notion
        const updates: any = {}
        if (member.email && !linkedByNotion.email) {
          updates.email = member.email
        }
        if (member.name && linkedByNotion.name !== member.name) {
          updates.name = member.name
        }
        // Always update jobTitle and team from Notion if they exist
        if (member.jobTitle) {
          updates.jobTitle = member.jobTitle
        }
        if (member.team) {
          updates.team = member.team
        }

        if (Object.keys(updates).length > 0) {
          await db.user.update({
            where: { id: linkedByNotion.id },
            data: updates,
          })
          results.linked++
          results.details.push({ 
            name: member.name, 
            email: member.email, 
            jobTitle: member.jobTitle,
            team: member.team,
            status: 'updated_existing_linked' 
          })
        } else {
          results.skipped++
          results.details.push({ name: member.name, status: 'already_linked_no_change' })
        }
        continue
      }

      // Try to find existing user by email first
      if (member.email) {
        const existingUserByEmail = existingUsers.find(
          u => u.email?.toLowerCase() === member.email?.toLowerCase()
        )
        
        if (existingUserByEmail) {
          // Link existing user to Notion and backfill email/name/jobTitle/team if needed
          const updates: any = {
            notionTeamMemberId: member.id,
            notionTeamMemberName: member.name,
          }
          if (member.email && !existingUserByEmail.email) {
            updates.email = member.email
          }
          if (member.name && existingUserByEmail.name !== member.name) {
            updates.name = member.name
          }
          // Always update jobTitle and team from Notion if they exist
          if (member.jobTitle) {
            updates.jobTitle = member.jobTitle
          }
          if (member.team) {
            updates.team = member.team
          }

          await db.user.update({
            where: { id: existingUserByEmail.id },
            data: updates,
          })
          results.linked++
          results.details.push({ 
            name: member.name, 
            email: member.email, 
            jobTitle: member.jobTitle,
            team: member.team,
            status: 'linked_by_email' 
          })
          continue
        }
      }

      // Try to find existing user by name (for databases without email)
      const existingUserByName = existingUsers.find(
        u => u.name?.toLowerCase() === member.name?.toLowerCase()
      )
      
      if (existingUserByName) {
        // Link existing user to Notion by name match and backfill email/jobTitle/team if available
        const updates: any = {
          notionTeamMemberId: member.id,
          notionTeamMemberName: member.name,
        }
        if (member.email && !existingUserByName.email) {
          updates.email = member.email
        }
        // Always update jobTitle and team from Notion if they exist
        if (member.jobTitle) {
          updates.jobTitle = member.jobTitle
        }
        if (member.team) {
          updates.team = member.team
        }

        await db.user.update({
          where: { id: existingUserByName.id },
          data: updates,
        })
        results.linked++
        results.details.push({ 
          name: member.name, 
          email: member.email, 
          jobTitle: member.jobTitle,
          team: member.team,
          status: 'linked_by_name' 
        })
        continue
      }

      // Create new placeholder user - they'll claim their account when signing in with Google
      // The account will be linked when they sign in with a matching name
      try {
        await db.user.create({
          data: {
            email: member.email || null, // May be null
            name: member.name,
            role: 'VIEWER', // Default role, admin can change
            notionTeamMemberId: member.id,
            notionTeamMemberName: member.name,
            jobTitle: member.jobTitle || null,
            team: member.team || null,
          }
        })
        results.created++
        results.details.push({ 
          name: member.name, 
          email: member.email || 'no email', 
          jobTitle: member.jobTitle,
          team: member.team,
          status: 'created' 
        })
      } catch (err: any) {
        // Skip if user creation fails (e.g., duplicate)
        results.skipped++
        results.details.push({ name: member.name, status: 'error', error: err.message })
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error syncing from Notion:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/users/sync-notion - Get Notion team members for preview
// Force dynamic rendering for this route

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    // Check if user is admin
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const notionMembers = await fetchNotionTeamMembers()
    return NextResponse.json(notionMembers)
  } catch (error: any) {
    console.error('Error fetching Notion team members:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

