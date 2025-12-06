import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getIntegrationConfig } from '@/lib/integrations'

// GET /api/slack/channels/[channelId] - Check if bot can access a specific channel
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> | { channelId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const resolvedParams = await Promise.resolve(params)
    let channelId = resolvedParams.channelId.trim()

    // Channel ID can be:
    // - Full ID: C1234567890 (starts with C/G/D, 9-11 chars)
    // - Channel name: sharethelove (without #)
    // - Channel name with #: #sharethelove
    
    // Remove # if present and normalize
    if (channelId.startsWith('#')) {
      channelId = channelId.slice(1)
    }
    
    // If it looks like a channel name (no C/G/D prefix), we'll try it as a name
    const isChannelName = !channelId.match(/^[CGD][A-Z0-9]{8,11}$/)
    
    // Log what we're testing
    console.log(`Testing channel - ID: "${channelId}", appears to be name: ${isChannelName}`)

    // Get Slack bot token
    const config = await getIntegrationConfig('slack')
    
    if (!config.apiKey || !config.enabled) {
      return NextResponse.json(
        { error: 'Slack is not configured' },
        { status: 400 }
      )
    }

    // Check if bot can access this channel using conversations.info
    // Log the request for debugging
    console.log('Testing Slack channel:', channelId, 'Is name:', isChannelName)
    
    // First, try to find it in the channels list (faster and more reliable)
    // This will also tell us if the bot can see it
    const listResponse = await fetch('https://slack.com/api/conversations.list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000,
      }),
    })
    
    if (listResponse.ok) {
      const listData = await listResponse.json()
      if (listData.ok && listData.channels) {
        // Try to find the channel by ID or name
        const foundChannel = listData.channels.find((ch: any) => 
          ch.id === channelId || 
          ch.name === channelId || 
          ch.name === channelId.replace(/^#/, '')
        )
        
        if (foundChannel) {
          return NextResponse.json({
            accessible: true,
            channel: {
              id: foundChannel.id,
              name: foundChannel.name,
              isPrivate: foundChannel.is_private,
              isMember: foundChannel.is_member,
              isArchived: foundChannel.is_archived,
            },
            foundVia: 'channels_list',
          })
        }
      }
    }
    
    // If not found in list, try conversations.info directly (this works even if not in list)
    // This is useful for channels the bot can access but might not appear in conversations.list
    console.log('Channel not in list, trying conversations.info directly...')
    let response = await fetch('https://slack.com/api/conversations.info', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        include_num_members: false, // Don't need member count
      }),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to check channel access' },
        { status: response.status }
      )
    }

    let data = await response.json()

    // Log the full response for debugging
    console.log('Slack API conversations.info response:', JSON.stringify(data, null, 2))

    // If invalid_arguments and it looks like a name, try without the # prefix
    if (!data.ok && data.error === 'invalid_arguments' && isChannelName) {
      // Try again with just the name (in case # was included)
      const cleanName = channelId.replace(/^#/, '')
      console.log('Retrying with cleaned name:', cleanName)
      
      response = await fetch('https://slack.com/api/conversations.info', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: cleanName,
        }),
      })
      
      if (response.ok) {
        data = await response.json()
        console.log('Retry response:', JSON.stringify(data, null, 2))
      }
    }

    if (!data.ok) {
      return NextResponse.json({
        accessible: false,
        error: data.error,
        message: getErrorMessage(data.error),
        // Include more details for invalid_arguments
        details: data.error === 'invalid_arguments' 
          ? `Channel identifier provided: "${channelId}". This might be an incomplete channel ID or the channel name might not be accessible. Try using the full channel ID from Slack (right-click channel > View channel details > Copy link, the ID is in the URL).`
          : undefined,
        _debug: process.env.NODE_ENV === 'development' ? {
          providedId: channelId,
          isChannelName,
          slackResponse: data,
        } : undefined,
      })
    }

    const channel = data.channel

    return NextResponse.json({
      accessible: true,
      channel: {
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private,
        isMember: channel.is_member,
        isArchived: channel.is_archived,
        // Include all channel properties for debugging
        _debug: process.env.NODE_ENV === 'development' ? channel : undefined,
      },
    })
  } catch (error: any) {
    console.error('Error checking channel access:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check channel access' },
      { status: 500 }
    )
  }
}

function getErrorMessage(slackError: string): string {
  const errorMessages: Record<string, string> = {
    'channel_not_found': 'Channel not found. The bot may not have access to this channel.',
    'missing_scope': 'Bot is missing required scopes to access this channel.',
    'not_authed': 'Bot token is invalid or expired.',
    'account_inactive': 'Bot account is inactive.',
    'invalid_auth': 'Invalid bot token.',
    'invalid_arguments': 'Slack API returned invalid_arguments. This usually means the bot doesn\'t have permission to access this channel, or the channel ID format is incorrect. If the channel appears in the list above, you can select it directly.',
  }
  return errorMessages[slackError] || `Slack API error: ${slackError}`
}

