import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getIntegrationConfig } from '@/lib/integrations'

// GET /api/slack/channels - Get list of Slack channels
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get Slack bot token
    const config = await getIntegrationConfig('slack')
    
    if (!config.apiKey || !config.enabled) {
      return NextResponse.json(
        { error: 'Slack is not configured' },
        { status: 400 }
      )
    }

    // Fetch channels from Slack API using TWO methods:
    // 1. users.conversations - Returns ONLY channels the bot is a member of (most reliable)
    // 2. conversations.list - Returns all channels bot can see (public + private it's a member of)
    // We'll combine both to get the most complete list
    
    let allChannels: any[] = []
    let cursor: string | null = null
    let hasMore = true
    let pageCount = 0
    const maxPages = 10 // Safety limit to prevent infinite loops

    // METHOD 1: users.conversations - Get channels bot is actually a member of
    console.log('Fetching channels via users.conversations (bot member channels)...')
    let userConversationsChannels: any[] = []
    let userCursor: string | null = null
    let userHasMore = true
    let userPageCount = 0
    
    while (userHasMore && userPageCount < maxPages) {
      const userRequestBody: any = {
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
      }
      
      if (userCursor) {
        userRequestBody.cursor = userCursor
      }
      
      try {
        // users.conversations uses GET, so we need to append params to URL
        const userUrl = new URL('https://slack.com/api/users.conversations')
        userUrl.searchParams.set('types', 'public_channel,private_channel')
        userUrl.searchParams.set('exclude_archived', 'true')
        userUrl.searchParams.set('limit', '1000')
        if (userCursor) {
          userUrl.searchParams.set('cursor', userCursor)
        }
        
        const userResponse = await fetch(userUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        })
        
        if (!userResponse.ok) {
          console.error('users.conversations failed:', userResponse.status)
          break
        }
        
        const userData = await userResponse.json()
        
        if (!userData.ok) {
          console.error('users.conversations API error:', userData.error)
          break
        }
        
        if (userData.channels && Array.isArray(userData.channels)) {
          userConversationsChannels = userConversationsChannels.concat(userData.channels)
          console.log(`users.conversations page ${userPageCount + 1}: ${userData.channels.length} channels`)
        }
        
        userCursor = userData.response_metadata?.next_cursor || null
        userHasMore = !!userCursor && userCursor !== '' && userCursor !== '0'
        userPageCount++
        
        if ((userData.channels?.length || 0) === 0) {
          userHasMore = false
        }
      } catch (error) {
        console.error('Error fetching users.conversations:', error)
        break
      }
    }
    
    console.log(`users.conversations total: ${userConversationsChannels.length} channels (bot is a member of these)`)
    
    // METHOD 2: conversations.list - Get all channels bot can see (including public channels)
    console.log('Fetching channels via conversations.list (all visible channels)...')
    
    // Helper function to fetch channels with given parameters
    const fetchChannelsPage = async (requestBody: any, pageNum: number) => {
      if (pageNum === 1) {
        console.log(`API Request (page ${pageNum}):`, JSON.stringify(requestBody, null, 2))
      }
      
      const response = await fetch('https://slack.com/api/conversations.list', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Log full response for debugging (first page only to avoid spam)
      if (pageNum === 1) {
        console.log('Slack API Response (first page):', JSON.stringify({
          ok: data.ok,
          error: data.error,
          channels_count: data.channels?.length || 0,
          response_metadata: data.response_metadata,
          sample_channel: data.channels?.[0] ? {
            id: data.channels[0].id,
            name: data.channels[0].name,
            is_archived: data.channels[0].is_archived,
            is_private: data.channels[0].is_private,
            is_member: data.channels[0].is_member,
          } : null,
        }, null, 2))
      }

      if (!data.ok) {
        // Provide helpful error messages for common issues
        let errorMessage = data.error || 'Slack API error'
        if (data.error === 'missing_scope') {
          errorMessage = 'Bot is missing required scopes. Ensure channels:read and groups:read are enabled.'
        } else if (data.error === 'invalid_auth') {
          errorMessage = 'Invalid bot token. Please check your Slack integration settings.'
        }
        
        throw new Error(errorMessage)
      }

      return data
    }

    // First, try with exclude_archived: true
    while (hasMore && pageCount < maxPages) {
      const requestBody: any = {
        types: 'public_channel,private_channel', // Removed mpim (group DMs) as those aren't channels
        exclude_archived: true,
        limit: 1000, // Max per page
      }
      
      if (cursor) {
        requestBody.cursor = cursor
      }
      
      try {
        const data = await fetchChannelsPage(requestBody, pageCount + 1)

        // Add channels from this page
        if (data.channels && Array.isArray(data.channels)) {
          allChannels = allChannels.concat(data.channels)
        }

        // Check if there are more pages
        cursor = data.response_metadata?.next_cursor || null
        hasMore = !!cursor && cursor !== '' && cursor !== '0' && (data.channels?.length || 0) > 0
        pageCount++

        console.log(`Fetched page ${pageCount}: ${data.channels?.length || 0} channels, cursor: ${cursor}, has more: ${hasMore}`)
        
        // Safety check: if we got 0 channels, stop (might be an error or end of list)
        if ((data.channels?.length || 0) === 0) {
          hasMore = false
        }
      } catch (error: any) {
        // If error occurs, return it
        return NextResponse.json(
          { error: error.message || 'Failed to fetch channels from Slack', slackError: error.message },
          { status: 400 }
        )
      }
    }

    console.log(`conversations.list total: ${allChannels.length} across ${pageCount} pages`)
    
    // Combine both methods: Start with users.conversations (most reliable for bot membership)
    // Then add any additional channels from conversations.list that aren't already included
    const combinedChannels = [...userConversationsChannels]
    
    // Add channels from conversations.list that aren't already in the list
    for (const channel of allChannels) {
      if (channel.id && !combinedChannels.find(c => c.id === channel.id)) {
        combinedChannels.push(channel)
      }
    }
    
    console.log(`Combined total: ${combinedChannels.length} channels (${userConversationsChannels.length} from users.conversations, ${allChannels.length} from conversations.list)`)
    
    // Deduplicate channels by ID (in case there are any duplicates)
    const channelMap = new Map<string, any>()
    for (const channel of combinedChannels) {
      if (channel.id && !channelMap.has(channel.id)) {
        channelMap.set(channel.id, channel)
      }
    }
    const uniqueChannels = Array.from(channelMap.values())
    
    console.log(`After deduplication: ${uniqueChannels.length} unique channels (from ${allChannels.length} total)`)
    
    // Debug: Log a sample channel to see all properties
    if (uniqueChannels.length > 0) {
      console.log('Sample channel from Slack API:', JSON.stringify(uniqueChannels[0], null, 2))
    }
    
    // Filter out archived channels - check multiple possible properties
    // BUT: Don't filter if exclude_archived was already set in the API call
    // We're double-checking here in case Slack's exclude_archived doesn't work perfectly
    const activeChannels = uniqueChannels.filter((channel: any) => {
      // Check multiple ways Slack might indicate archived status
      const isArchived = channel.is_archived === true || 
                        channel.is_archived === 1 ||
                        channel.archived === true ||
                        channel.archived === 1
      
      // Also check if channel is actually usable (has a name and id)
      const isValid = channel.id && channel.name
      
      return !isArchived && isValid
    })
    
    const archivedChannels = uniqueChannels.filter((channel: any) => {
      const isArchived = channel.is_archived === true || 
                        channel.is_archived === 1 ||
                        channel.archived === true ||
                        channel.archived === 1
      return isArchived
    })
    
    // Log for debugging
    console.log(`Slack channels: ${activeChannels.length} active, ${archivedChannels.length} archived (filtered out)`)
    
    // Check for specific channel the user mentioned - check both before and after filtering
    const agiloftChannelRaw = uniqueChannels.find((ch: any) => ch.id === 'C019YLK4ZU7' || ch.name === 'client_agiloft')
    const agiloftChannelActive = activeChannels.find((ch: any) => ch.id === 'C019YLK4ZU7' || ch.name === 'client_agiloft')
    
    if (agiloftChannelRaw) {
      console.log('Found client_agiloft channel in raw list:', {
        id: agiloftChannelRaw.id,
        name: agiloftChannelRaw.name,
        is_archived: agiloftChannelRaw.is_archived,
        archived: agiloftChannelRaw.archived,
        is_private: agiloftChannelRaw.is_private,
        is_member: agiloftChannelRaw.is_member,
        is_channel: agiloftChannelRaw.is_channel,
        is_group: agiloftChannelRaw.is_group,
        in_active_list: !!agiloftChannelActive,
      })
      if (!agiloftChannelActive) {
        console.log('⚠️ client_agiloft was filtered out - checking why...')
        const isArchived = agiloftChannelRaw.is_archived === true || 
                          agiloftChannelRaw.is_archived === 1 ||
                          agiloftChannelRaw.archived === true ||
                          agiloftChannelRaw.archived === 1
        console.log('Archive check:', { isArchived, is_archived: agiloftChannelRaw.is_archived, archived: agiloftChannelRaw.archived })
      }
    } else {
      console.log('⚠️ client_agiloft channel (C019YLK4ZU7) NOT found in channels list at all')
      console.log('Searching for similar channels...')
      const similar = uniqueChannels.filter((ch: any) => 
        ch.name?.toLowerCase().includes('agiloft') || 
        ch.id === 'C019YLK4ZU7'
      )
      console.log('Similar channels found:', similar.map((ch: any) => ({ id: ch.id, name: ch.name })))
    }
    
    if (archivedChannels.length > 0) {
      console.log('Sample archived channels:', archivedChannels.slice(0, 3).map((c: any) => ({ name: c.name, is_archived: c.is_archived, archived: c.archived })))
    }
    
    // IMPORTANT: If client has a slackChannelId but it's not in the list,
    // we should still include it if the bot can access it
    // This handles cases where Slack's conversations.list doesn't return all channels
    // even though the bot is a member (workspace settings, pagination limits, etc.)
    const clientSlackChannels: string[] = []
    try {
      // Get all clients with Slack channels to check
      const { db } = await import('@/lib/db')
      const clientsWithSlack = await db.client.findMany({
        where: {
          slackChannelId: { not: null },
        },
        select: {
          slackChannelId: true,
        },
      })
      clientSlackChannels.push(...clientsWithSlack.map(c => c.slackChannelId!).filter(Boolean))
    } catch (error) {
      console.error('Error fetching client Slack channels:', error)
    }

    // Check if any client channels are missing from the list
    const missingChannels: any[] = []
    for (const channelId of clientSlackChannels) {
      if (!uniqueChannels.find(ch => ch.id === channelId)) {
        // Try to fetch this channel directly
        try {
          const infoResponse = await fetch('https://slack.com/api/conversations.info', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              channel: channelId,
            }),
          })
          
          if (infoResponse.ok) {
            const infoData = await infoResponse.json()
            if (infoData.ok && infoData.channel && !infoData.channel.is_archived) {
              missingChannels.push(infoData.channel)
              console.log(`Found missing channel via conversations.info: ${infoData.channel.name} (${infoData.channel.id})`)
            }
          }
        } catch (error) {
          console.error(`Error checking missing channel ${channelId}:`, error)
        }
      }
    }

    // Add missing channels to the active channels list
    const allActiveChannels = [...activeChannels, ...missingChannels]
    
    // Deduplicate again (in case a missing channel was already in the list)
    const finalChannelMap = new Map<string, any>()
    allActiveChannels.forEach(ch => {
      if (ch.id && !finalChannelMap.has(ch.id)) {
        finalChannelMap.set(ch.id, ch)
      }
    })
    const finalActiveChannels = Array.from(finalChannelMap.values())

    // Format and sort channels (active first, then by name)
    const channels = finalActiveChannels
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        isChannel: channel.is_channel,
        isGroup: channel.is_group,
        // Include archived status for debugging in response
        _debug: {
          is_archived: channel.is_archived,
          archived: channel.archived,
          found_via: missingChannels.find(mc => mc.id === channel.id) ? 'conversations.info' : 'conversations.list',
        }
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name)) // Sort alphabetically

    return NextResponse.json({ 
      channels,
      meta: {
        total: uniqueChannels.length,
        active: finalActiveChannels.length,
        archived: archivedChannels.length,
        pages: pageCount,
        missingChannelsFound: missingChannels.length,
        debug: process.env.NODE_ENV === 'development' ? {
          sampleChannel: uniqueChannels[0] || null,
          archivedSample: archivedChannels[0] || null,
          agiloftChannel: agiloftChannelRaw || null,
          missingChannels: missingChannels.map(mc => ({ id: mc.id, name: mc.name })),
        } : undefined,
      }
    })
  } catch (error: any) {
    console.error('Error fetching Slack channels:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Slack channels' },
      { status: 500 }
    )
  }
}

