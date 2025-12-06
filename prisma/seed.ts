import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Check if template already exists
  const existingTemplate = await prisma.checkTemplate.findFirst({
    where: { isDefault: true }
  })

  if (existingTemplate) {
    console.log('✅ Default template already exists, skipping...')
    return
  }

  // Create default check template
  const defaultTemplate = await prisma.checkTemplate.create({
    data: {
      name: 'Full Stack Infrastructure Check',
      description: 'Complete infrastructure review including Okta, Gmail, Jamf, CrowdStrike, and Vanta',
      isDefault: true,
      categories: {
        create: [
          {
            name: 'Okta',
            icon: 'shield',
            order: 0,
            items: {
              create: [
                {
                  text: 'Check on alerts and verify if any need to be addressed (ie. assignment/provisioning errors)',
                  order: 0,
                },
                {
                  text: 'Review last month of sign in logs for strange failed attempts (ie. brute force attempts, strange geographical locations)',
                  order: 1,
                },
                {
                  text: '(if applicable) Are there any new Okta SAML/SCIM apps you can set up?',
                  order: 2,
                  isOptional: true,
                },
              ],
            },
          },
          {
            name: 'Gmail',
            icon: 'mail',
            order: 1,
            items: {
              create: [
                {
                  text: 'Check on 2fa and access controls, if accounts are set to bypass check on those accounts and confirm',
                  order: 0,
                },
                {
                  text: '(if applicable) Review DMARC reports for any failing services and SPF lookups',
                  order: 1,
                  isOptional: true,
                },
                {
                  text: 'Check security dashboard for suspicious activity',
                  order: 2,
                },
              ],
            },
          },
          {
            name: 'Jamf',
            icon: 'laptop',
            order: 2,
            items: {
              create: [
                {
                  text: 'Check which devices have been checked in and approved in the last month',
                  order: 0,
                },
                {
                  text: 'Review any devices that have not checked in recently',
                  order: 1,
                },
                {
                  text: 'Verify MDM profiles are up to date',
                  order: 2,
                },
              ],
            },
          },
          {
            name: 'CrowdStrike',
            icon: 'shield-alert',
            order: 3,
            items: {
              create: [
                {
                  text: 'Review any detections or incidents from the last month',
                  order: 0,
                },
                {
                  text: 'Verify all endpoints have the sensor installed and are checking in',
                  order: 1,
                },
                {
                  text: 'Check prevention policies are properly configured',
                  order: 2,
                },
              ],
            },
          },
          {
            name: 'Vanta',
            icon: 'check-circle',
            order: 4,
            items: {
              create: [
                {
                  text: 'Review compliance status and any failing tests',
                  order: 0,
                },
                {
                  text: 'Check for any new risks or vulnerabilities flagged',
                  order: 1,
                },
                {
                  text: 'Verify all integrations are connected and syncing',
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
  })

  console.log(`✅ Created default template: ${defaultTemplate.name}`)
  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('Note: Client data should be synced from Notion using the Sync button in the app.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
