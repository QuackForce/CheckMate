import { db } from '../src/lib/db'

async function checkUserAccount(emailOrName?: string) {
  const searchTerm = emailOrName || process.argv[2]
  
  if (!searchTerm) {
    console.log('Usage: npx tsx scripts/link-dylan-account.ts [email or name]')
    console.log('Example: npx tsx scripts/link-dylan-account.ts dylan@itjones.com')
    console.log('Example: npx tsx scripts/link-dylan-account.ts Dylan\n')
    return
  }

  console.log(`Checking account for: ${searchTerm}\n`)

  // Find user by email or name
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { name: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    include: {
      accounts: true,
    },
  })

  if (!user) {
    console.log(`❌ User not found matching "${searchTerm}"`)
    console.log('\nTry searching by email or name (partial match works)')
    return
  }

  console.log('User status:')
  console.log(`  ID: ${user.id}`)
  console.log(`  Name: ${user.name}`)
  console.log(`  Email: ${user.email || '(not set)'}`)
  console.log(`  Role: ${user.role || '(not set)'}`)
  console.log(`  Accounts linked: ${user.accounts.length}\n`)

  if (user.accounts.length > 0) {
    console.log('✅ User has accounts linked:')
    user.accounts.forEach((acc) => {
      console.log(`  - ${acc.provider} (${acc.providerAccountId})`)
    })
    console.log('\nIf you\'re still getting OAuthAccountNotLinked error:')
    console.log('1. The email from Google might not match exactly (case/whitespace)')
    console.log('2. Clear browser cookies and try signing in again')
    console.log('3. The auth.ts changes should handle email normalization automatically')
  } else {
    console.log('⚠️  No accounts linked.')
    console.log('\nThe user needs to sign in with Google to create the account link.')
    console.log('The PrismaAdapter should handle this automatically when they sign in.')
    console.log('\nIf the error persists:')
    console.log('1. Ensure email in database matches Google\'s email exactly')
    console.log('2. The auth.ts changes normalize email matching (case-insensitive)')
    console.log('3. Have the user clear browser cookies and try again')
  }
}

checkUserAccount()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

