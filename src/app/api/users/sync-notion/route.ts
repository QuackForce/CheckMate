import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

const NOTION_API_KEY = process.env.NOTION_API_KEY || ''
const TEAM_MEMBERS_DB = process.env.NOTION_TEAM_MEMBERS_DATABASE_ID || ''

interface NotionTeamMember {
  id: string
  name: string
  email: string | null
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
      
      // Exclude placeholder accounts
      if (name && name.trim() !== 'JIT - New Member') {
        members.push({
          id: page.id,
          name,
          email,
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
        // Already linked - but we may want to BACKFILL missing email or update name from Notion
        const updates: any = {}
        if (member.email && !linkedByNotion.email) {
          updates.email = member.email
        }
        if (member.name && linkedByNotion.name !== member.name) {
          updates.name = member.name
        }

        if (Object.keys(updates).length > 0) {
          await db.user.update({
            where: { id: linkedByNotion.id },
            data: updates,
          })
          results.linked++
          results.details.push({ name: member.name, email: member.email, status: 'updated_existing_linked' })
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
          // Link existing user to Notion and backfill email/name if needed
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

          await db.user.update({
            where: { id: existingUserByEmail.id },
            data: updates,
          })
          results.linked++
          results.details.push({ name: member.name, email: member.email, status: 'linked_by_email' })
          continue
        }
      }

      // Try to find existing user by name (for databases without email)
      const existingUserByName = existingUsers.find(
        u => u.name?.toLowerCase() === member.name?.toLowerCase()
      )
      
      if (existingUserByName) {
        // Link existing user to Notion by name match and backfill email if available
        const updates: any = {
          notionTeamMemberId: member.id,
          notionTeamMemberName: member.name,
        }
        if (member.email && !existingUserByName.email) {
          updates.email = member.email
        }

        await db.user.update({
          where: { id: existingUserByName.id },
          data: updates,
        })
        results.linked++
        results.details.push({ name: member.name, email: member.email, status: 'linked_by_name' })
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
          }
        })
        results.created++
        results.details.push({ name: member.name, email: member.email || 'no email', status: 'created' })
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

