import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const notionApiKey = process.env.NOTION_API_KEY
  const notionClientDbId = process.env.NOTION_CLIENT_DATABASE_ID
  const notionTeamDbId = process.env.NOTION_TEAM_MEMBERS_DATABASE_ID

  if (!notionApiKey) {
    console.log('⚠️ NOTION_API_KEY not found in environment variables')
    console.log('Skipping migration. You can configure Notion in Settings > Integrations.')
    return
  }

  console.log('Migrating Notion integration from env vars to database...')

  const config: Record<string, string> = {}
  if (notionClientDbId) {
    config.clientDatabaseId = notionClientDbId
  }
  if (notionTeamDbId) {
    config.teamMembersDatabaseId = notionTeamDbId
  }

  const integration = await prisma.integrationSettings.upsert({
    where: { provider: 'notion' },
    update: {
      enabled: true,
      apiKey: notionApiKey,
      config: Object.keys(config).length > 0 ? JSON.stringify(config) : null,
      connectedAt: new Date(),
    },
    create: {
      provider: 'notion',
      enabled: true,
      apiKey: notionApiKey,
      config: Object.keys(config).length > 0 ? JSON.stringify(config) : null,
      connectedAt: new Date(),
    },
  })

  console.log('✅ Notion integration migrated to database!')
  console.log(`   Provider: ${integration.provider}`)
  console.log(`   Enabled: ${integration.enabled}`)
  console.log(`   Has API Key: ${!!integration.apiKey}`)
  if (integration.config) {
    console.log(`   Config: ${integration.config}`)
  }
  console.log('\n💡 You can now remove NOTION_API_KEY from your .env file')
  console.log('   (The app will use the database value instead)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

