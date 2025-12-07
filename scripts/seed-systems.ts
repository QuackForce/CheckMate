import { PrismaClient, SystemCategoryType } from '@prisma/client'

const prisma = new PrismaClient()

interface SystemSeed {
  name: string
  category: SystemCategoryType
  icon: string
  description: string
  checkItems: { text: string; description?: string; isOptional?: boolean }[]
}

const systems: SystemSeed[] = [
  // ============================================
  // IDENTITY / EMAIL
  // ============================================
  {
    name: 'Google Workspace',
    category: 'IDENTITY',
    icon: 'mail',
    description: 'Google Workspace / Gmail identity and email management',
    checkItems: [
      { text: 'Check on alerts and verify if any need to be addressed (ie. assignment/provisioning errors)' },
      { text: 'Review last month of sign in logs for strange failed attempts (ie. brute force attempts, strange geographical locations)' },
      { text: 'Check on 2FA and access controls, if accounts are set to bypass check on those accounts and confirm' },
      { text: '(if applicable) Review DMARC reports for any failing services and SPF lookups', isOptional: true },
      { text: '(if applicable) Are there any new Okta SAML/SCIM apps you can set up?', isOptional: true },
    ],
  },
  {
    name: 'Okta',
    category: 'IDENTITY',
    icon: 'key-round',
    description: 'Okta identity provider and SSO management',
    checkItems: [
      { text: 'Review System Log for suspicious sign-in attempts or failed authentications' },
      { text: 'Check for any pending user provisioning or deprovisioning tasks' },
      { text: 'Review MFA enrollment status and ensure compliance' },
      { text: 'Check application assignments and access policies' },
      { text: 'Review any new SAML/SCIM integrations that can be configured' },
    ],
  },
  {
    name: 'Microsoft Entra ID',
    category: 'IDENTITY',
    icon: 'shield-check',
    description: 'Azure AD / Entra ID identity management',
    checkItems: [
      { text: 'Review sign-in logs for risky sign-ins or suspicious activity' },
      { text: 'Check Conditional Access policies and ensure they are enforced' },
      { text: 'Review MFA registration and authentication methods' },
      { text: 'Check for stale or inactive user accounts' },
      { text: 'Review enterprise application access and permissions' },
    ],
  },

  // ============================================
  // MDM (Mobile Device Management)
  // ============================================
  {
    name: 'Kandji',
    category: 'MDM',
    icon: 'laptop',
    description: 'Apple device management with Kandji',
    checkItems: [
      { text: 'Review device alerts (ie. SIP disabled, failed application installs)' },
      { text: 'Review devices that are offline for greater than 2 weeks (export and hand to consultant)' },
      { text: 'Review OS patching and adjust enforcement as needed' },
      { text: 'Review Apple certificate renewals and update 🔄 Renewal Database' },
    ],
  },
  {
    name: 'Addigy',
    category: 'MDM',
    icon: 'laptop',
    description: 'Apple device management with Addigy',
    checkItems: [
      { text: 'Review device alerts (ie. SIP disabled, failed application installs)' },
      { text: 'Review devices that are offline for greater than 2 weeks (export and hand to consultant)' },
      { text: 'Review OS patching and adjust enforcement as needed' },
      { text: 'Review Apple certificate renewals and update 🔄 Renewal Database' },
    ],
  },
  {
    name: 'Jamf Pro',
    category: 'MDM',
    icon: 'laptop',
    description: 'Apple device management with Jamf',
    checkItems: [
      { text: 'Review device alerts (ie. SIP disabled, failed application installs)' },
      { text: 'Review devices that are offline for greater than 2 weeks (export and hand to consultant)' },
      { text: 'Review OS patching and adjust enforcement as needed' },
      { text: 'Review Apple certificate renewals (APNs, VPP tokens) and update 🔄 Renewal Database' },
      { text: 'Check Smart Groups for devices falling out of compliance' },
    ],
  },
  {
    name: 'Microsoft Intune',
    category: 'MDM',
    icon: 'laptop',
    description: 'Microsoft Intune device management',
    checkItems: [
      { text: 'Review device compliance status and non-compliant devices' },
      { text: 'Review devices that have not checked in for extended periods' },
      { text: 'Check Windows Update rings and deployment status' },
      { text: 'Review application deployment status and failures' },
      { text: 'Check Conditional Access device compliance policies' },
    ],
  },

  // ============================================
  // AV/EDR (Antivirus / Endpoint Detection & Response)
  // ============================================
  {
    name: 'CrowdStrike',
    category: 'AV_EDR',
    icon: 'shield',
    description: 'CrowdStrike Falcon endpoint protection',
    checkItems: [
      { text: 'Review all alerts and mitigate any unresolved threats' },
      { text: "Check on the client's auto mitigation settings and adjust as needed" },
      { text: 'Verify no devices have suddenly stopped checking in, or check the automatic decommission setting. Also spot check device count vs MDM count.' },
      { text: 'Verify all devices have latest confirmed stable agent version and update the package for auto update policy' },
    ],
  },
  {
    name: 'Sophos',
    category: 'AV_EDR',
    icon: 'shield',
    description: 'Sophos endpoint protection and XDR',
    checkItems: [
      { text: 'Review all alerts and mitigate any unresolved threats' },
      { text: "Check on the client's auto mitigation settings and adjust as needed" },
      { text: 'Verify no devices have suddenly stopped checking in, or check the automatic decommission setting. Also spot check device count vs MDM count.' },
      { text: 'Verify all devices have latest confirmed stable agent version and update the package for auto update policy' },
    ],
  },
  {
    name: 'SentinelOne',
    category: 'AV_EDR',
    icon: 'shield',
    description: 'SentinelOne autonomous endpoint protection',
    checkItems: [
      { text: 'Review all threats and incidents, ensure proper remediation' },
      { text: 'Check threat intelligence and behavioral AI settings' },
      { text: 'Verify agent health and connectivity status across all endpoints' },
      { text: 'Review agent version compliance and update policies' },
      { text: 'Check exclusions and ensure they are properly documented' },
    ],
  },

  // ============================================
  // PASSWORD MANAGER
  // ============================================
  {
    name: '1Password',
    category: 'PASSWORD',
    icon: 'key',
    description: '1Password team password management',
    checkItems: [
      { text: 'Review Watchtower and domain breach report' },
      { text: "Review SCIM bridge if set up, update it if it's out of date" },
      { text: 'Check for weak or reused passwords in shared vaults', isOptional: true },
      { text: 'Review team member access and vault permissions', isOptional: true },
    ],
  },
  {
    name: 'Bitwarden',
    category: 'PASSWORD',
    icon: 'key',
    description: 'Bitwarden password management',
    checkItems: [
      { text: 'Review exposed passwords report' },
      { text: 'Check organization vault health and weak passwords' },
      { text: 'Review user access and collection permissions' },
      { text: 'Verify directory sync is functioning (if configured)' },
    ],
  },

  // ============================================
  // GRC (Governance, Risk, Compliance)
  // ============================================
  {
    name: 'Vanta',
    category: 'GRC',
    icon: 'clipboard-check',
    description: 'Vanta security compliance automation',
    checkItems: [
      { text: 'Review failing controls and integrations' },
      { text: 'Review for missing/expired evidence' },
      { text: 'Review for any work needed for current observation period' },
      { text: 'Confirm all pending offboard QCs are complete' },
    ],
  },
  {
    name: 'Drata',
    category: 'GRC',
    icon: 'clipboard-check',
    description: 'Drata compliance automation platform',
    checkItems: [
      { text: 'Review control status and failing tests' },
      { text: 'Check evidence collection status and gaps' },
      { text: 'Review personnel compliance (training, background checks)' },
      { text: 'Verify integration health and data sync' },
    ],
  },

  // ============================================
  // SECURITY TRAINING
  // ============================================
  {
    name: 'KnowBe4',
    category: 'SECURITY_TRAINING',
    icon: 'graduation-cap',
    description: 'KnowBe4 security awareness training',
    checkItems: [
      { text: 'Check for incomplete trainings and send out reminders' },
      { text: 'Review phishing simulation results and high-risk users' },
      { text: 'Check training campaign completion rates', isOptional: true },
    ],
  },
  {
    name: 'Curricula',
    category: 'SECURITY_TRAINING',
    icon: 'graduation-cap',
    description: 'Curricula security awareness platform',
    checkItems: [
      { text: 'Review training completion status and send reminders' },
      { text: 'Check phishing simulation results' },
      { text: 'Review user risk scores and trends' },
    ],
  },

  // ============================================
  // BACKUP
  // ============================================
  {
    name: 'Backupify',
    category: 'BACKUP',
    icon: 'hard-drive',
    description: 'Backupify cloud-to-cloud backup for Google Workspace',
    checkItems: [
      { text: 'Verify backup jobs are completing successfully' },
      { text: 'Check for any failed or skipped backups' },
      { text: 'Review backup coverage (all users/drives included)' },
    ],
  },
  {
    name: 'Spanning',
    category: 'BACKUP',
    icon: 'hard-drive',
    description: 'Spanning Backup for Google Workspace and Microsoft 365',
    checkItems: [
      { text: 'Verify daily backup completion status' },
      { text: 'Check for any backup errors or warnings' },
      { text: 'Review license usage and ensure all users are covered' },
    ],
  },

  // ============================================
  // EMAIL SECURITY
  // ============================================
  {
    name: 'Abnormal Security',
    category: 'EMAIL_SECURITY',
    icon: 'mail-warning',
    description: 'Abnormal Security email threat protection',
    checkItems: [
      { text: 'Review blocked threats and attack trends' },
      { text: 'Check VIP/executive protection alerts' },
      { text: 'Review any false positives and adjust policies' },
    ],
  },
  {
    name: 'Proofpoint',
    category: 'EMAIL_SECURITY',
    icon: 'mail-warning',
    description: 'Proofpoint email security and protection',
    checkItems: [
      { text: 'Review threat dashboard and blocked attacks' },
      { text: 'Check quarantine for false positives' },
      { text: 'Review TAP (Targeted Attack Protection) alerts' },
      { text: 'Verify email authentication (SPF/DKIM/DMARC) status' },
    ],
  },
]

async function seedSystems() {
  console.log('🌱 Seeding Systems Database...\n')

  for (const systemData of systems) {
    // Check if system already exists
    const existing = await prisma.system.findUnique({
      where: { name: systemData.name },
    })

    if (existing) {
      console.log(`⏭️  Skipping ${systemData.name} (already exists)`)
      continue
    }

    // Create system with check items
    const system = await prisma.system.create({
      data: {
        name: systemData.name,
        category: systemData.category,
        icon: systemData.icon,
        description: systemData.description,
        checkItems: {
          create: systemData.checkItems.map((item, index) => ({
            text: item.text,
            description: item.description,
            isOptional: item.isOptional || false,
            order: index,
          })),
        },
      },
      include: { checkItems: true },
    })

    console.log(`✅ Created ${system.name} with ${system.checkItems.length} check items`)
  }

  // Summary
  const totalSystems = await prisma.system.count()
  const totalItems = await prisma.systemCheckItem.count()
  console.log(`\n📊 Summary: ${totalSystems} systems with ${totalItems} total check items`)
}

seedSystems()
  .catch(console.error)
  .finally(() => prisma.$disconnect())




