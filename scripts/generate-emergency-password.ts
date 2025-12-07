/**
 * Script to generate a hashed password for emergency admin login
 * 
 * Usage: npx tsx scripts/generate-emergency-password.ts <password>
 * 
 * Then add the output to your .env file as:
 * EMERGENCY_PASSWORD_HASH=<hash>
 * EMERGENCY_ADMIN_EMAILS=admin@itjones.com
 */

import bcrypt from 'bcryptjs'

async function main() {
  const password = process.argv[2]

  if (!password) {
    console.log('🔐 Emergency Password Generator\n')
    console.log('Usage: npx tsx scripts/generate-emergency-password.ts <password>\n')
    console.log('Example: npx tsx scripts/generate-emergency-password.ts MySecurePassword123!\n')
    console.log('Then add to your .env file:')
    console.log('  EMERGENCY_PASSWORD_HASH=<generated-hash>')
    console.log('  EMERGENCY_ADMIN_EMAILS=michael@itjones.com')
    process.exit(1)
  }

  if (password.length < 12) {
    console.error('❌ Password must be at least 12 characters long for security')
    process.exit(1)
  }

  console.log('🔐 Generating password hash...\n')

  // Use a high salt rounds for security
  const hash = await bcrypt.hash(password, 12)

  console.log('✅ Password hash generated!\n')
  console.log('Add these lines to your .env file:\n')
  console.log('─'.repeat(60))
  console.log(`EMERGENCY_PASSWORD_HASH=${hash}`)
  console.log('EMERGENCY_ADMIN_EMAILS=michael@itjones.com')
  console.log('─'.repeat(60))
  console.log('\n⚠️  Keep this password secure! Store it in a password manager.')
  console.log('📍 Emergency login URL: /login/emergency')
}

main()


