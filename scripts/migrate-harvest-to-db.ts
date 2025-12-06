import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const harvestClientId = process.env.HARVEST_CLIENT_ID
  const harvestClientSecret = process.env.HARVEST_CLIENT_SECRET
  const harvestRedirectUri = process.env.HARVEST_REDIRECT_URI

  if (!harvestClientId || !harvestClientSecret || !harvestRedirectUri) {
    console.log('⚠️ Harvest OAuth credentials not found in environment variables')
    console.log('You can configure Harvest in Settings > Integrations')
    return
  }

  console.log('Migrating Harvest OAuth config from env vars to database...')

  const config = {
    redirectUri: harvestRedirectUri,
  }

  const integration = await prisma.integrationSettings.upsert({
    where: { provider: 'harvest' },
    update: {
      enabled: true,
      apiKey: harvestClientId, // Store client ID in apiKey field
      apiSecret: harvestClientSecret, // Store client secret in apiSecret field
      config: JSON.stringify(config),
      connectedAt: new Date(),
    },
    create: {
      provider: 'harvest',
      enabled: true,
      apiKey: harvestClientId,
      apiSecret: harvestClientSecret,
      config: JSON.stringify(config),
      connectedAt: new Date(),
    },
  })

  console.log('✅ Harvest OAuth config migrated to database!')
  console.log(`   Provider: ${integration.provider}`)
  console.log(`   Enabled: ${integration.enabled}`)
  console.log(`   Has Client ID: ${!!integration.apiKey}`)
  console.log(`   Has Client Secret: ${!!integration.apiSecret}`)
  console.log('\n💡 You can now remove HARVEST_CLIENT_ID, HARVEST_CLIENT_SECRET, and HARVEST_REDIRECT_URI from your .env file')
  console.log('   (The app will use the database values instead)')
  console.log('\n⚠️  Note: Users will need to reconnect their Harvest accounts after this change')
  console.log('   (Their existing tokens will still work, but new connections will use the new config)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())


