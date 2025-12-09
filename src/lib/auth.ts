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

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: hasGoogleAuth ? (PrismaAdapter(db) as any) : undefined,
  secret: process.env.AUTH_SECRET || 'development-secret-change-in-production',
  providers: hasGoogleAuth 
    ? [
        Google({
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
          authorization: {
            params: {
              access_type: 'offline',
              response_type: 'code',
              // Basic auth only - calendar permissions requested separately
              scope: 'openid email profile',
            },
          },
        }),
      ]
    : [],
  callbacks: {
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

          // Ensure user exists and has proper setup
          // The PrismaAdapter should handle account linking, but we'll ensure the user is ready
          try {
            const existingUser = await db.user.findUnique({
              where: { email: user.email },
              select: { id: true, role: true, email: true, name: true, image: true },
            })

            if (existingUser) {
              console.log(`[Auth] Found existing user ${existingUser.id} for ${user.email}`)
              
              // Ensure role is set
              if (!existingUser.role) {
                console.log(`[Auth] Setting default role for ${user.email}`)
                await db.user.update({
                  where: { id: existingUser.id },
                  data: { role: 'CONSULTANT' },
                })
              }

              // Update name/image if they've changed
              await db.user.update({
                where: { id: existingUser.id },
                data: {
                  name: user.name || existingUser.name || undefined,
                  image: user.image || existingUser.image || undefined,
                  emailVerified: new Date(), // Mark email as verified when they sign in with Google
                },
              })

              console.log(`[Auth] User ${existingUser.id} is ready - PrismaAdapter will link the account`)
            } else {
              console.log(`[Auth] No existing user found for ${user.email} - PrismaAdapter will create new user`)
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
          // In production with database, use user data
          if (user?.id) {
            session.user.id = user.id
            // Default to CONSULTANT if role is null/undefined
            session.user.role = (user.role || 'CONSULTANT') as UserRole
            session.user.notionTeamMemberId = (user as any).notionTeamMemberId
            console.log(`[Auth] Session created for user ${user.id} (${session.user.email}) with role ${session.user.role}`)
          } else if (token?.sub) {
            // JWT mode fallback
            session.user.id = token.sub
            session.user.role = (token.role as UserRole) || 'IT_ENGINEER'
            console.log(`[Auth] Session created from token for ${token.sub}`)
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
  // Use database session when Google OAuth is configured
  session: {
    strategy: hasGoogleAuth ? 'database' : 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
    updateAge: 60 * 60, // Refresh session every hour if active
  },
})

