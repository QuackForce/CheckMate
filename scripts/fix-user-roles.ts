import { db } from '../src/lib/db'

async function fixUserRoles() {
  console.log('Checking for Dylan and all users...\n')

  // Check for Dylan specifically
  const dylan = await db.user.findFirst({
    where: {
      OR: [
        { name: { contains: 'Dylan', mode: 'insensitive' } },
        { email: { contains: 'dylan', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
    },
  })

  if (dylan) {
    console.log('Dylan\'s user record:')
    console.log(`  Name: ${dylan.name}`)
    console.log(`  Email: ${dylan.email || 'No email'}`)
    console.log(`  Role: ${dylan.role}`)
    console.log(`  Email Verified: ${dylan.emailVerified}`)
    console.log(`  ID: ${dylan.id}\n`)

    // If Dylan doesn't have CONSULTANT role, update it
    if (dylan.role !== 'CONSULTANT' && dylan.role !== 'IT_ENGINEER' && dylan.role !== 'IT_MANAGER' && dylan.role !== 'ADMIN') {
      console.log('Updating Dylan\'s role to CONSULTANT...')
      await db.user.update({
        where: { id: dylan.id },
        data: { role: 'CONSULTANT' },
      })
      console.log('✅ Updated Dylan\'s role\n')
    }
  } else {
    console.log('⚠️  Could not find Dylan in the database\n')
  }

  // List all users to check
  const allUsers = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  })

  console.log(`Total users in database: ${allUsers.length}\n`)
  console.log('Users with potential issues:')
  let hasIssues = false
  allUsers.forEach((user) => {
    if (!user.role || !user.email) {
      console.log(`  ⚠️  ${user.name} - Role: ${user.role || 'MISSING'}, Email: ${user.email || 'MISSING'}`)
      hasIssues = true
    }
  })

  if (!hasIssues) {
    console.log('  ✅ All users look good!')
  }
}

fixUserRoles()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })

