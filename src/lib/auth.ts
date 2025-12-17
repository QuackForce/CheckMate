import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'
import type { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
      notionTeamMemberId?: string | null
    }
  }

  interface User {
    role: UserRole
    notionTeamMemberId?: string | null
  }
}

// Check if Google OAuth is configured (supports both naming conventions)
const googleClientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET
const hasGoogleAuth = googleClientId && 
  googleClientId !== 'placeholder' &&
  googleClientSecret &&
  googleClientSecret !== 'placeholder'

// Debug logging
console.log('[Auth] Initializing NextAuth with:', {
  hasGoogleAuth,
  hasClientId: !!googleClientId,
  hasSecret: !!googleClientSecret,
  providersCount: hasGoogleAuth ? 1 : 0,
  hasAdapter: hasGoogleAuth,
})

// Initialize adapter only if Google auth is configured
let adapter: ReturnType<typeof PrismaAdapter> | undefined
if (hasGoogleAuth) {
  try {
    adapter = PrismaAdapter(db)
    console.log('[Auth] PrismaAdapter initialized successfully')
    // Test the adapter works
    if (!adapter || typeof adapter.createUser !== 'function') {
      throw new Error('PrismaAdapter is invalid - missing required methods')
    }
  } catch (error: any) {
    console.error('[Auth] ❌ Failed to initialize PrismaAdapter:', error.message)
    console.error('[Auth] Error stack:', error.stack)
    throw new Error(`Failed to initialize PrismaAdapter: ${error.message}`)
  }
} else {
  console.log('[Auth] ⚠️ Google auth not configured - adapter will be undefined')
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Only use adapter with database sessions (currently using JWT)
  adapter: undefined, // Temporarily disabled to debug Configuration error
  secret: process.env.AUTH_SECRET || 'development-secret-change-in-production',
  debug: process.env.NODE_ENV === 'development',
  trustHost: true, // Allow NextAuth to trust the host header
  providers: hasGoogleAuth 
    ? [
        Google({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, user, account }) {
      // When user first signs in, user object is available
      if (user) {
        // Try to find user by email first (more reliable than ID)
        try {
          const dbUser = user.email 
            ? await db.user.findFirst({
                where: { 
                  email: {
                    equals: user.email,
                    mode: 'insensitive',
                  }
                },
                select: {
                  id: true,
                  role: true,
                  image: true,
                  name: true,
                  email: true,
                },
              })
            : null
          
          if (dbUser) {
            // Only store user ID in token to minimize cookie size
            // All other data will be fetched in session callback
            token.id = dbUser.id
            console.log(`[Auth] JWT: Found user ${dbUser.id} (${dbUser.email}) with role ${dbUser.role}`)
          } else if (user.id) {
            // Fallback to ID lookup
            const dbUserById = await db.user.findUnique({
              where: { id: user.id },
              select: {
                id: true,
              },
            })
            if (dbUserById) {
              token.id = dbUserById.id
              console.log(`[Auth] JWT: Found user by ID ${dbUserById.id}`)
            } else {
              token.id = user.id
              console.log(`[Auth] JWT: User not found in DB, using user.id ${user.id}`)
            }
          }
        } catch (error) {
          console.error('[Auth] Error fetching user in jwt callback:', error)
          if (user.id) token.id = user.id
        }
      } else if (token?.id) {
        // On subsequent requests, keep only the ID in the token
        // User data will be fetched fresh in the session callback
        // This minimizes cookie size to prevent "REQUEST_HEADER_TOO_LARGE" errors
      }
      return token
    },
    async signIn({ user, account }) {
      try {
        // Domain restriction - only allow specific domains
        const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || ['itjones.com']
        
        if (hasGoogleAuth && user.email && account?.provider === 'google') {
          const emailDomain = user.email.split('@')[1]?.toLowerCase()
          
          console.log(`[Auth] Sign-in attempt for ${user.email} (domain: ${emailDomain})`)
          
          // Check if domain is allowed
          if (!allowedDomains.some(d => d.trim().toLowerCase() === emailDomain)) {
            console.log(`[Auth] ❌ Rejected: Domain ${emailDomain} not in allowed list`)
            return false // Reject sign-in - domain not allowed
          }
          
          console.log(`[Auth] ✅ Domain check passed`)
          
          // Auto-link to Notion team member on sign-in
          if (user.name) {
            try {
              // Check if there's a placeholder user from Notion (no email, matching name)
              // Only auto-link if there's exactly ONE match (avoid duplicates like 2 Jordans)
              const matchingUsers = await db.user.findMany({
                where: {
                  email: null,
                  name: user.name,
                  notionTeamMemberId: { not: null }, // Must be from Notion sync
                }
              })
              
              if (matchingUsers.length === 1) {
                // Exactly one match - safe to auto-link
                console.log(`[Auth] Auto-linking ${user.email} to existing Notion user`)
                await db.user.update({
                  where: { id: matchingUsers[0].id },
                  data: { email: user.email }
                })
              }
              // If multiple matches, don't auto-link - admin will need to link manually
            } catch (error) {
              console.error('[Auth] Error in auto-link:', error)
            }
          }

          // Ensure user exists and account is linked
          // The PrismaAdapter should handle this, but we'll ensure it works
          try {
            // Use Google's email exactly as provided (PrismaAdapter needs exact match)
            const googleEmail = user.email?.trim()
            if (!googleEmail) {
              console.log(`[Auth] ⚠️ No email from Google`)
              return true // Let PrismaAdapter handle it
            }
            
            // Find existing user by email (case-insensitive search)
            const existingUser = await db.user.findFirst({
              where: {
                email: {
                  equals: googleEmail,
                  mode: 'insensitive',
                },
              },
              include: {
                accounts: {
                  where: { provider: 'google' },
                  select: { id: true, providerAccountId: true },
                },
              },
            })

            if (existingUser) {
              console.log(`[Auth] Found existing user ${existingUser.id} for ${googleEmail}`)
              
              // CRITICAL: Update email to match Google's EXACTLY (case-sensitive for PrismaAdapter)
              // PrismaAdapter requires exact email match to link accounts automatically
              if (existingUser.email !== googleEmail) {
                console.log(`[Auth] Updating email to match Google's exactly: ${googleEmail}`)
                await db.user.update({
                  where: { id: existingUser.id },
                  data: { email: googleEmail },
                })
              }
              
              // Check if Google account is already linked
              if (existingUser.accounts.length === 0 && account) {
                console.log(`[Auth] ⚠️ User exists but no Google account linked - manually linking`)
                
                // Manually create the account link to prevent OAuthAccountNotLinked error
                try {
                  await db.account.create({
                    data: {
                      id: crypto.randomUUID(),
                      userId: existingUser.id,
                      type: account.type,
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      access_token: account.access_token,
                      expires_at: account.expires_at,
                      token_type: account.token_type,
                      scope: account.scope,
                      id_token: account.id_token,
                      refresh_token: account.refresh_token,
                      session_state: typeof account.session_state === 'string' ? account.session_state : null,
                    },
                  })
                  console.log(`[Auth] ✅ Manually linked Google account to user ${existingUser.id}`)
                } catch (linkError: any) {
                  // If account already exists (race condition), that's fine
                  if (linkError.code === 'P2002') {
                    console.log(`[Auth] Account already linked (race condition)`)
                  } else {
                    console.error(`[Auth] Error manually linking account:`, linkError)
                    // Don't fail - let PrismaAdapter try
                  }
                }
              } else {
                console.log(`[Auth] ✅ Google account already linked`)
              }
              
              // Ensure role is set
              if (!existingUser.role) {
                console.log(`[Auth] Setting default role for ${googleEmail}`)
                await db.user.update({
                  where: { id: existingUser.id },
                  data: { role: 'CONSULTANT' },
                })
              }

              // Update name/image if they've changed
              // Also track login activity
              await db.user.update({
                where: { id: existingUser.id },
                data: {
                  name: user.name || existingUser.name || undefined,
                  image: user.image || existingUser.image || undefined,
                  emailVerified: new Date(), // Mark email as verified when they sign in with Google
                  // @ts-ignore - Prisma types may be out of sync, but these fields exist in schema
                  lastLoginAt: new Date(),
                  // @ts-ignore - Prisma types may be out of sync, but these fields exist in schema
                  loginCount: { increment: 1 },
                },
              })

              // Create login activity record
              try {
                // @ts-ignore - Prisma types may be out of sync, but LoginActivity model exists in schema
                await (db as any).loginActivity.create({
                  data: {
                    userId: existingUser.id,
                    // IP and user agent can be extracted from request if available
                    // For now, we'll track just the timestamp
                  },
                })
              } catch (activityError) {
                // Don't fail login if activity tracking fails
                console.error('[Auth] Error creating login activity:', activityError)
              }

              console.log(`[Auth] User ${existingUser.id} is ready`)
            } else {
              console.log(`[Auth] No existing user found for ${googleEmail} - PrismaAdapter will create new user`)
              // For new users, PrismaAdapter will create them, but we'll track login after creation
              // This will be handled in a post-signin hook if needed
            }
          } catch (error) {
            console.error('[Auth] Error ensuring user setup:', error)
            // Don't fail the sign-in, let PrismaAdapter handle it
          }

          console.log(`[Auth] ✅ Sign-in approved for ${user.email}`)
        }
        return true
      } catch (error) {
        console.error('[Auth] ❌ Error in signIn callback:', error)
        return false
      }
    },
    async session({ session, user, token }) {
      try {
        if (session?.user) {
          // With JWT sessions, user is not available - use token instead
          if (token?.id || token?.email) {
            // Fetch fresh user data from database to ensure we have latest role and image
            try {
              let dbUser = null
              
              // Try to find by ID first
              if (token.id) {
                dbUser = await db.user.findUnique({
                  where: { id: token.id as string },
                  select: {
                    id: true,
                    role: true,
                    image: true,
                    name: true,
                    email: true,
                    notionTeamMemberId: true,
                  },
                })
              }
              
              // If not found by ID, try by email
              if (!dbUser && token.email) {
                dbUser = await db.user.findFirst({
                  where: {
                    email: {
                      equals: token.email as string,
                      mode: 'insensitive',
                    }
                  },
                  select: {
                    id: true,
                    role: true,
                    image: true,
                    name: true,
                    email: true,
                    notionTeamMemberId: true,
                  },
                })
              }
              
              if (dbUser) {
                session.user.id = dbUser.id
                session.user.role = (dbUser.role || 'CONSULTANT') as UserRole
                session.user.image = dbUser.image
                session.user.name = dbUser.name
                 session.user.email = dbUser.email ?? ''
                session.user.notionTeamMemberId = dbUser.notionTeamMemberId
                console.log(`[Auth] Session created for user ${dbUser.id} (${dbUser.email}) with role ${dbUser.role}`)
              } else {
                // Fallback to token data if user not found
                session.user.id = (token.id as string) || 'unknown'
                session.user.role = (token.role as UserRole) || 'CONSULTANT'
                session.user.image = token.image as string | null | undefined
                session.user.name = token.name as string | null | undefined
                console.log(`[Auth] User not found in DB, using token data for ${token.id || token.email}`)
              }
            } catch (dbError) {
              console.error('[Auth] Error fetching user in session callback:', dbError)
              // Fallback to token data
              session.user.id = (token.id as string) || 'unknown'
              session.user.role = (token.role as UserRole) || 'CONSULTANT'
              session.user.image = token.image as string | null | undefined
            }
          } else if (user?.id) {
            // Database session mode (if we switch back)
            session.user.id = user.id
            session.user.role = (user.role || 'CONSULTANT') as UserRole
            session.user.notionTeamMemberId = (user as any).notionTeamMemberId
            console.log(`[Auth] Session created for user ${user.id} (${session.user.email}) with role ${session.user.role}`)
          } else {
            // Fallback if neither user nor token is available
            console.warn('[Auth] ⚠️ Session callback: No user or token data available')
            session.user.id = 'unknown'
            session.user.role = 'CONSULTANT'
          }
        }
        return session
      } catch (error) {
        console.error('[Auth] ❌ Error in session callback:', error)
        // Return a minimal session to prevent complete failure
        if (session?.user) {
          session.user.id = 'error'
          session.user.role = 'CONSULTANT'
        }
        return session
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Temporarily use JWT sessions to debug Configuration error
  // TODO: Switch back to database sessions once Configuration error is resolved
  session: {
    strategy: 'jwt', // Using JWT instead of database to avoid Configuration error
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // Refresh session every hour if active
  },
})

