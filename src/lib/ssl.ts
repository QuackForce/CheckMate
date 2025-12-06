/**
 * SSL Certificate Check Service
 * Uses Node.js TLS module to check SSL certificate details
 */

import * as tls from 'tls'
import * as net from 'net'

export interface SSLResult {
  found: boolean
  status: 'valid' | 'expiring_soon' | 'expired' | 'invalid' | null
  issuer: string | null
  expiry: Date | null
  daysUntilExpiry: number | null
  error?: string
}

/**
 * Check SSL certificate for a domain using Node.js TLS
 */
export async function checkSSL(domain: string): Promise<SSLResult> {
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .toLowerCase()

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: cleanDomain,
        port: 443,
        servername: cleanDomain, // For SNI
        rejectUnauthorized: false, // Accept all certs to inspect them
        timeout: 10000,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate()
          
          if (!cert || !cert.valid_to) {
            socket.destroy()
            resolve({
              found: false,
              status: null,
              issuer: null,
              expiry: null,
              daysUntilExpiry: null,
              error: 'No certificate found',
            })
            return
          }

          const expiry = new Date(cert.valid_to)
          const now = new Date()
          const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          // Determine status
          let status: SSLResult['status'] = 'valid'
          if (daysUntilExpiry < 0) {
            status = 'expired'
          } else if (daysUntilExpiry < 30) {
            status = 'expiring_soon'
          }

          // Check if cert is actually authorized
          if (!socket.authorized) {
            const authError = socket.authorizationError
            if (authError === 'CERT_HAS_EXPIRED') {
              status = 'expired'
            } else if (authError) {
              status = 'invalid'
            }
          }

          // Get issuer
          const issuer = cert.issuer?.O || cert.issuer?.CN || null

          socket.destroy()
          resolve({
            found: true,
            status,
            issuer,
            expiry,
            daysUntilExpiry,
          })
        } catch (err) {
          socket.destroy()
          resolve({
            found: false,
            status: null,
            issuer: null,
            expiry: null,
            daysUntilExpiry: null,
            error: 'Failed to parse certificate',
          })
        }
      }
    )

    socket.on('error', (err: any) => {
      socket.destroy()
      resolve({
        found: false,
        status: null,
        issuer: null,
        expiry: null,
        daysUntilExpiry: null,
        error: err.message || 'Connection failed',
      })
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve({
        found: false,
        status: null,
        issuer: null,
        expiry: null,
        daysUntilExpiry: null,
        error: 'Connection timed out',
      })
    })
  })
}

/**
 * Simple SSL check - just verifies HTTPS is working (for client-side use)
 */
export async function checkSSLSimple(domain: string): Promise<SSLResult> {
  // This is a fallback that just checks if HTTPS works
  // Use checkSSL for full certificate details
  return checkSSL(domain)
}
