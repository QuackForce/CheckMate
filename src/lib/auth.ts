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
      // Domain restriction - only allow specific domains
      const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || ['itjones.com']
      
      if (hasGoogleAuth && user.email && account?.provider === 'google') {
        const emailDomain = user.email.split('@')[1]?.toLowerCase()
        
        // Check if domain is allowed
        if (!allowedDomains.some(d => d.trim().toLowerCase() === emailDomain)) {
          return false // Reject sign-in - domain not allowed
        }
        
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
              await db.user.update({
                where: { id: matchingUsers[0].id },
                data: { email: user.email }
              })
            }
            // If multiple matches, don't auto-link - admin will need to link manually
          } catch (error) {
            console.error('Error in signIn callback:', error)
          }
        }
      }
      return true
    },
    async session({ session, user, token }) {
      if (session.user) {
        // In production with database, use user data
        if (user) {
          session.user.id = user.id
          session.user.role = user.role as UserRole
          session.user.notionTeamMemberId = (user as any).notionTeamMemberId
        } else if (token) {
          // JWT mode fallback
          session.user.id = token.sub || 'demo-user'
          session.user.role = 'IT_ENGINEER' as UserRole
        }
      }
      return session
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

