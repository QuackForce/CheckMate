import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function diagnoseUserAuth(emailOrName?: string) {
  const searchTerm = emailOrName || process.argv[2]
  
  if (!searchTerm) {
    console.log('Usage: npx tsx scripts/diagnose-user-auth.ts [email or name]')
    console.log('Example: npx tsx scripts/diagnose-user-auth.ts user@example.com')
    console.log('Example: npx tsx scripts/diagnose-user-auth.ts "John Doe"\n')
    await prisma.$disconnect()
    return
  }

  console.log(`=== User Authentication Diagnosis: ${searchTerm} ===\n`)

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      accounts: true,
      sessions: {
        orderBy: { expires: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) {
    console.log(`❌ User not found matching "${searchTerm}"`)
    await prisma.$disconnect()
    return
  }

  console.log('✅ User found:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Name: ${user.name}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Role: ${user.role}`)
  console.log(`   Email Verified: ${user.emailVerified}`)
  console.log(`   Created: ${user.createdAt}`)
  console.log(`   Updated: ${user.updatedAt}`)

  console.log(`\n📧 Google Accounts Linked: ${user.accounts.length}`)
  if (user.accounts.length === 0) {
    console.log('   ❌ NO GOOGLE ACCOUNT LINKED - This is the problem!')
    console.log('   The OAuth flow is not completing successfully.')
  } else {
    user.accounts.forEach((acc, i) => {
      console.log(`   ${i + 1}. Provider: ${acc.provider}`)
      console.log(`      Account ID: ${acc.providerAccountId}`)
      console.log(`      Has Access Token: ${!!acc.access_token}`)
      console.log(`      Expires: ${acc.expires_at ? new Date(acc.expires_at * 1000).toISOString() : 'N/A'}`)
    })
  }

  console.log(`\n🔐 Active Sessions: ${user.sessions.length}`)
  if (user.sessions.length === 0) {
    console.log('   ❌ NO ACTIVE SESSIONS')
  } else {
    user.sessions.forEach((session, i) => {
      const isExpired = new Date(session.expires) < new Date()
      console.log(`   ${i + 1}. Session: ${session.id}`)
      console.log(`      Expires: ${session.expires.toISOString()}`)
      console.log(`      Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
    })
  }

  // Check environment
  console.log('\n🔧 Environment Check:')
  const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET
  const nextAuthUrl = process.env.NEXTAUTH_URL
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || ['itjones.com']

  console.log(`   Google Client ID: ${googleClientId ? '✅ Set' : '❌ Missing'}`)
  console.log(`   Google Client Secret: ${googleClientSecret ? '✅ Set' : '❌ Missing'}`)
  console.log(`   NEXTAUTH_URL: ${nextAuthUrl || '❌ Missing (defaults to http://localhost:3000)'}`)
  console.log(`   Allowed Domains: ${allowedDomains.join(', ')}`)
  
  if (user.email) {
    const emailDomain = user.email.split('@')[1]?.toLowerCase()
    const isAllowed = allowedDomains.some(d => d.trim().toLowerCase() === emailDomain)
    console.log(`   User's domain (${emailDomain}): ${isAllowed ? '✅ Allowed' : '❌ NOT ALLOWED'}`)
  }

  console.log('\n💡 Recommendations:')
  if (user.accounts.length === 0) {
    console.log('   1. The OAuth flow is not completing - check:')
    console.log('      - Browser console for errors')
    console.log('      - Server logs when user tries to sign in')
    console.log('      - Google Cloud Console: Is the redirect URI correct?')
    console.log('      - Is NEXTAUTH_URL set correctly for the environment?')
    console.log('   2. The blocked requests in the console might be preventing the OAuth redirect')
    console.log('   3. Try signing in from a different network (in case of firewall/proxy)')
    console.log('   4. Check if there are any CORS or CSP headers blocking the redirect')
  }

  await prisma.$disconnect()
}

diagnoseUserAuth().catch(console.error)

