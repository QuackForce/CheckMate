import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Simple in-memory rate limiting (in production, use Redis)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_ATTEMPTS = 5

// Get allowed admin emails from env (comma-separated)
const ALLOWED_ADMINS = (process.env.EMERGENCY_ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

// Hashed password from env
const EMERGENCY_PASSWORD_HASH = process.env.EMERGENCY_PASSWORD_HASH || ''

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Check rate limiting
    const attempts = loginAttempts.get(ip)
    if (attempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt
      
      if (timeSinceLastAttempt < RATE_LIMIT_WINDOW && attempts.count >= MAX_ATTEMPTS) {
        // Log the blocked attempt
        console.warn(`[EMERGENCY LOGIN] Rate limited - IP: ${ip}`)
        
        return NextResponse.json(
          { error: 'Too many failed attempts. Please try again later.' },
          { status: 429 }
        )
      }
      
      // Reset if window has passed
      if (timeSinceLastAttempt >= RATE_LIMIT_WINDOW) {
        loginAttempts.delete(ip)
      }
    }

    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if emergency login is configured
    if (!EMERGENCY_PASSWORD_HASH || ALLOWED_ADMINS.length === 0) {
      console.warn(`[EMERGENCY LOGIN] Not configured - attempted by: ${normalizedEmail}`)
      return NextResponse.json(
        { error: 'Emergency login is not configured' },
        { status: 503 }
      )
    }

    // Check if email is in allowed list
    if (!ALLOWED_ADMINS.includes(normalizedEmail)) {
      console.warn(`[EMERGENCY LOGIN] Unauthorized email attempted: ${normalizedEmail} from IP: ${ip}`)
      
      // Track failed attempt
      const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
      loginAttempts.set(ip, { count: current.count + 1, lastAttempt: Date.now() })
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, EMERGENCY_PASSWORD_HASH)
    
    if (!isValidPassword) {
      console.warn(`[EMERGENCY LOGIN] Invalid password for: ${normalizedEmail} from IP: ${ip}`)
      
      // Track failed attempt
      const current = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 }
      loginAttempts.set(ip, { count: current.count + 1, lastAttempt: Date.now() })
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Find or create the user in the database
    let user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Create the admin user if they don't exist
      user = await db.user.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          name: 'Emergency Admin',
          role: 'ADMIN',
          updatedAt: new Date(),
        }
      })
      console.log(`[EMERGENCY LOGIN] Created new admin user: ${normalizedEmail}`)
    }

    // Ensure user is an admin
    if (user.role !== 'ADMIN') {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'ADMIN' }
      })
      console.log(`[EMERGENCY LOGIN] Upgraded user to admin: ${normalizedEmail}`)
    }

    // Log successful emergency login
    console.log(`[EMERGENCY LOGIN] ✅ SUCCESS - ${normalizedEmail} from IP: ${ip} at ${new Date().toISOString()}`)

    // Create a simple session token
    const sessionToken = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmergency: true,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    })).toString('base64')

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('emergency-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    })

    // Clear rate limiting on success
    loginAttempts.delete(ip)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })

  } catch (error: any) {
    console.error('[EMERGENCY LOGIN] Error:', error)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}








