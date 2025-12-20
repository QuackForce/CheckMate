import { auth } from './auth'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export type AllowedRole = 'ADMIN' | 'IT_ENGINEER' | 'IT_MANAGER' | 'VIEWER'

/**
 * Check for emergency session cookie
 */
export async function getEmergencySession() {
  try {
    const cookieStore = await cookies()
    const emergencyCookie = cookieStore.get('emergency-session')
    
    if (!emergencyCookie?.value) {
      return null
    }

    const session = JSON.parse(Buffer.from(emergencyCookie.value, 'base64').toString())
    
    // Check if session is expired
    if (session.exp && session.exp < Date.now()) {
      return null
    }

    return {
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        isEmergency: true,
      }
    }
  } catch {
    return null
  }
}

/**
 * Check if the current user has the required role
 * @param allowedRoles - Array of roles that are allowed
 * @returns Object with session and error response if unauthorized
 */
export async function checkRole(allowedRoles: AllowedRole[]) {
  // First try regular NextAuth session
  let session = await auth()
  
  // If no regular session, check for emergency session
  if (!session?.user) {
    const emergencySession = await getEmergencySession()
    if (emergencySession) {
      session = emergencySession as any
    }
  }

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
    console.error('Role check failed:', { 
      userRole, 
      allowedRoles,
      sessionUserId: session.user.id 
    })
    return {
      session,
      error: NextResponse.json(
        { error: `Forbidden - ${allowedRoles.join(' or ')} access required. Your role: ${userRole}` },
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
 * Quick check for team management (ADMIN, IT_ENGINEER, IT_MANAGER)
 */
export async function requireTeamManager() {
  return checkRole(['ADMIN', 'IT_ENGINEER', 'IT_MANAGER'])
}

/**
 * Quick check for any authenticated user
 */
export async function requireAuth() {
  return checkRole(['ADMIN', 'IT_ENGINEER', 'VIEWER'])
}


