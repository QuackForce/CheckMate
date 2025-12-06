import { auth } from './auth'
import { NextResponse } from 'next/server'

export type AllowedRole = 'ADMIN' | 'IT_ENGINEER' | 'VIEWER'

/**
 * Check if the current user has the required role
 * @param allowedRoles - Array of roles that are allowed
 * @returns Object with session and error response if unauthorized
 */
export async function checkRole(allowedRoles: AllowedRole[]) {
  const session = await auth()

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
    }
  }

  const userRole = session.user.role as AllowedRole
  if (!allowedRoles.includes(userRole)) {
    return {
      session,
      error: NextResponse.json(
        { error: `Forbidden - ${allowedRoles.join(' or ')} access required` },
        { status: 403 }
      ),
    }
  }

  return { session, error: null }
}

/**
 * Quick check for admin-only actions
 */
export async function requireAdmin() {
  return checkRole(['ADMIN'])
}

/**
 * Quick check for engineer+ actions (edit/create)
 */
export async function requireEngineer() {
  return checkRole(['ADMIN', 'IT_ENGINEER'])
}

/**
 * Quick check for any authenticated user
 */
export async function requireAuth() {
  return checkRole(['ADMIN', 'IT_ENGINEER', 'VIEWER'])
}


