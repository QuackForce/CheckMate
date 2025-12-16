import { db } from '../src/lib/db'

async function checkUserAuth(emailOrName?: string) {
  const searchTerm = emailOrName || process.argv[2]
  
  if (!searchTerm) {
    console.log('Usage: npx tsx scripts/check-user-auth.ts [email or name]')
    console.log('Example: npx tsx scripts/check-user-auth.ts user@example.com')
    console.log('Example: npx tsx scripts/check-user-auth.ts "John Doe"\n')
    return
  }

  console.log(`Checking authentication setup for: ${searchTerm}\n`)

  // Find user
  const user = await db.user.findFirst({
    where: {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      Account: true,
      Session: {
        orderBy: { expires: 'desc' },
        take: 5,
      },
    },
  })

  if (!user) {
    console.log(`❌ User not found matching "${searchTerm}"`)
    return
  }

  console.log('User Record:')
  console.log(`  ID: ${user.id}`)
  console.log(`  Name: ${user.name}`)
  console.log(`  Email: ${user.email}`)
  console.log(`  Email Verified: ${user.emailVerified}`)
  console.log(`  Role: ${user.role}`)
  console.log(`  Image: ${user.image || 'None'}\n`)

  console.log(`Accounts linked: ${user.Account.length}`)
  user.Account.forEach((account, i) => {
    console.log(`  Account ${i + 1}:`)
    console.log(`    Provider: ${account.provider}`)
    console.log(`    Provider Account ID: ${account.providerAccountId}`)
    console.log(`    Type: ${account.type}`)
    console.log(`    Has Access Token: ${!!account.access_token}`)
    console.log(`    Expires At: ${account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'Never'}`)
  })

  console.log(`\nRecent Sessions: ${user.Session.length}`)
  user.Session.forEach((session, i) => {
    const isExpired = session.expires < new Date()
    console.log(`  Session ${i + 1}:`)
    console.log(`    Token: ${session.sessionToken.substring(0, 20)}...`)
    console.log(`    Expires: ${session.expires.toISOString()}`)
    console.log(`    Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
  })

  // Check if there are any issues
  console.log('\n🔍 Analysis:')
  
  if (user.Account.length === 0) {
    console.log('  ⚠️  No Google account linked! This could cause login issues.')
    console.log('  💡 Solution: User needs to log in with Google to create the account link.')
  } else {
    const googleAccount = user.Account.find(a => a.provider === 'google')
    if (!googleAccount) {
      console.log('  ⚠️  No Google account found (might have other provider)')
    } else {
      console.log('  ✅ Google account is linked')
    }
  }

  const activeSessions = user.Session.filter(s => s.expires > new Date())
  if (activeSessions.length === 0) {
    console.log('  ⚠️  No active sessions found')
  } else {
    console.log(`  ✅ ${activeSessions.length} active session(s)`)
  }

  if (!user.emailVerified) {
    console.log('  ⚠️  Email not verified (this might be okay for Google OAuth)')
  }
}

checkUserAuth()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

