import { db } from '../src/lib/db'

async function checkDylanAuth() {
  console.log('Checking Dylan\'s authentication setup...\n')

  // Find Dylan
  const dylan = await db.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'Dylan', mode: 'insensitive' } },
        { email: { contains: 'dylan', mode: 'insensitive' } },
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

  if (!dylan) {
    console.log('❌ Dylan not found in database')
    return
  }

  console.log('Dylan\'s User Record:')
  console.log(`  ID: ${dylan.id}`)
  console.log(`  Name: ${dylan.name}`)
  console.log(`  Email: ${dylan.email}`)
  console.log(`  Email Verified: ${dylan.emailVerified}`)
  console.log(`  Role: ${dylan.role}`)
  console.log(`  Image: ${dylan.image || 'None'}\n`)

  console.log(`Accounts linked: ${dylan.accounts.length}`)
  dylan.accounts.forEach((account, i) => {
    console.log(`  Account ${i + 1}:`)
    console.log(`    Provider: ${account.provider}`)
    console.log(`    Provider Account ID: ${account.providerAccountId}`)
    console.log(`    Type: ${account.type}`)
    console.log(`    Has Access Token: ${!!account.access_token}`)
    console.log(`    Expires At: ${account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'Never'}`)
  })

  console.log(`\nRecent Sessions: ${dylan.sessions.length}`)
  dylan.sessions.forEach((session, i) => {
    const isExpired = session.expires < new Date()
    console.log(`  Session ${i + 1}:`)
    console.log(`    Token: ${session.sessionToken.substring(0, 20)}...`)
    console.log(`    Expires: ${session.expires.toISOString()}`)
    console.log(`    Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
  })

  // Check if there are any issues
  console.log('\n🔍 Analysis:')
  
  if (dylan.accounts.length === 0) {
    console.log('  ⚠️  No Google account linked! This could cause login issues.')
    console.log('  💡 Solution: Dylan needs to log in with Google to create the account link.')
  } else {
    const googleAccount = dylan.accounts.find(a => a.provider === 'google')
    if (!googleAccount) {
      console.log('  ⚠️  No Google account found (might have other provider)')
    } else {
      console.log('  ✅ Google account is linked')
    }
  }

  const activeSessions = dylan.sessions.filter(s => s.expires > new Date())
  if (activeSessions.length === 0) {
    console.log('  ⚠️  No active sessions found')
  } else {
    console.log(`  ✅ ${activeSessions.length} active session(s)`)
  }

  if (!dylan.emailVerified) {
    console.log('  ⚠️  Email not verified (this might be okay for Google OAuth)')
  }
}

checkDylanAuth()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

