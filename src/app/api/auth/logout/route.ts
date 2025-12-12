import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Forceful logout endpoint:
 * - Clears emergency-session cookie
 * - Clears all known NextAuth/Auth.js cookies (session + CSRF + state)
 * - Deletes DB session rows for the token(s) found
 * This bypasses client signOut to avoid redirect loops.
 */
export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    const sessionTokens = [
      request.cookies.get('next-auth.session-token')?.value,
      request.cookies.get('__Secure-next-auth.session-token')?.value,
      request.cookies.get('authjs.session-token')?.value,
      request.cookies.get('__Secure-authjs.session-token')?.value,
    ].filter(Boolean) as string[]

    // Delete DB sessions for any tokens found (database strategy)
    if (sessionTokens.length > 0) {
      try {
        await db.session.deleteMany({ where: { sessionToken: { in: sessionTokens } } })
      } catch (err) {
        console.error('[LOGOUT] Error deleting session from DB:', err)
      }
    }

    const cookieNames = [
      'emergency-session',
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      'next-auth.state',
      // Auth.js v5 cookie names
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.csrf-token',
      '__Host-authjs.csrf-token',
      'authjs.callback-url',
      'authjs.state',
    ]

    for (const name of cookieNames) {
      response.cookies.set({
        name,
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('[LOGOUT] Error clearing cookies:', error)
    return NextResponse.json({ error: 'Failed to clear cookies' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Reuse POST logic to clear cookies, then redirect
  const res = await POST(request)
  const redirect = NextResponse.redirect(new URL('/login', request.url), res.status)
  const setCookies = res.headers.getSetCookie()
  for (const sc of setCookies) {
    redirect.headers.append('Set-Cookie', sc)
  }
  return redirect
}

