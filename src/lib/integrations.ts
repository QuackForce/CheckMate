/**
 * Integration Configuration Helper
 * Reads integration settings from database with env fallback
 */

import { db } from './db'

// Cache for integration configs
const configCache = new Map<string, any>()

export async function getIntegrationConfig(provider: string): Promise<{
  apiKey: string | null
  apiSecret: string | null
  accessToken: string | null
  refreshToken: string | null
  config: Record<string, any>
  enabled: boolean
}> {
  // Return cached if available
  const cacheKey = `${provider}_config`
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey)
  }

  try {
    const integration = await db.integrationSettings.findUnique({
      where: { provider },
      select: {
        enabled: true,
        apiKey: true,
        apiSecret: true,
        accessToken: true,
        refreshToken: true,
        config: true,
      },
    })

    let parsedConfig: Record<string, any> = {}
    if (integration?.config) {
      try {
        parsedConfig = JSON.parse(integration.config)
      } catch {
        // Invalid JSON, ignore
      }
    }

    const result = {
      apiKey: integration?.enabled && integration.apiKey ? integration.apiKey : null,
      apiSecret: integration?.enabled && integration.apiSecret ? integration.apiSecret : null,
      accessToken: integration?.accessToken || null,
      refreshToken: integration?.refreshToken || null,
      config: parsedConfig,
      enabled: integration?.enabled || false,
    }

    // Cache the result
    configCache.set(cacheKey, result)
    return result
  } catch (error) {
    console.warn(`Failed to load ${provider} config from database, using env fallback`)
  }

  // Fallback to environment variables
  const fallback: Record<string, any> = {}
  
  if (provider === 'notion') {
    fallback.apiKey = process.env.NOTION_API_KEY || null
    fallback.config = {
      clientDatabaseId: process.env.NOTION_CLIENT_DATABASE_ID || '',
      teamMembersDatabaseId: process.env.NOTION_TEAM_MEMBERS_DATABASE_ID || '',
    }
  } else if (provider === 'harvest') {
    fallback.apiKey = process.env.HARVEST_CLIENT_ID || null
    fallback.apiSecret = process.env.HARVEST_CLIENT_SECRET || null
    fallback.config = {
      redirectUri: process.env.HARVEST_REDIRECT_URI || '',
    }
  } else if (provider === 'slack') {
    fallback.apiKey = process.env.SLACK_BOT_TOKEN || null
  } else if (provider === 'google_calendar') {
    fallback.apiKey = process.env.GOOGLE_CALENDAR_CLIENT_ID || null
    fallback.apiSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || null
  }

  const result = {
    apiKey: fallback.apiKey || null,
    apiSecret: fallback.apiSecret || null,
    enabled: !!fallback.apiKey,
    accessToken: null,
    refreshToken: null,
    config: fallback.config || {},
  }

  configCache.set(cacheKey, result)
  return result
}

export function clearIntegrationConfigCache(provider?: string) {
  if (provider) {
    configCache.delete(`${provider}_config`)
  } else {
    configCache.clear()
  }
}

