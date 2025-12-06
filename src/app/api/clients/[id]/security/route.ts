import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { lookupDMARC, lookupSPF, lookupDKIM } from '@/lib/dns-security'
import { checkSSLSimple } from '@/lib/ssl'

export const dynamic = 'force-dynamic'

type CheckType = 'dmarc' | 'spf' | 'dkim' | 'ssl' | 'all'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { domain, checkType = 'all', dkimSelector } = await request.json() as {
      domain: string
      checkType?: CheckType
      dkimSelector?: string
    }
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const results: Record<string, any> = {}
    const updateData: Record<string, any> = {}

    // DMARC Check
    if (checkType === 'all' || checkType === 'dmarc') {
      const dmarcResult = await lookupDMARC(domain)
      results.dmarc = dmarcResult
      updateData.dmarc = dmarcResult.policy || 'Not Set'
      updateData.dmarcRecord = dmarcResult.rawRecord
      updateData.dmarcLastChecked = new Date()
    }

    // SPF Check
    if (checkType === 'all' || checkType === 'spf') {
      const spfResult = await lookupSPF(domain)
      results.spf = spfResult
      updateData.spf = spfResult.policy || 'Not Set'
      updateData.spfRecord = spfResult.rawRecord
      updateData.spfLastChecked = new Date()
    }

    // DKIM Check
    if (checkType === 'all' || checkType === 'dkim') {
      const dkimResult = await lookupDKIM(domain, dkimSelector)
      results.dkim = dkimResult
      updateData.dkim = dkimResult.found ? 'Found' : 'Not Found'
      updateData.dkimSelector = dkimResult.selector
      updateData.dkimRecord = dkimResult.rawRecord
      updateData.dkimLastChecked = new Date()
    }

    // SSL Check
    if (checkType === 'all' || checkType === 'ssl') {
      const sslResult = await checkSSLSimple(domain)
      results.ssl = sslResult
      updateData.sslStatus = sslResult.status || 'Not Found'
      updateData.sslIssuer = sslResult.issuer
      updateData.sslExpiry = sslResult.expiry
      updateData.sslLastChecked = new Date()
    }

    // Update client with results
    await db.client.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({
      ...results,
      saved: true,
    })
  } catch (error: any) {
    console.error('Security check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET current security status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await db.client.findUnique({
      where: { id: params.id },
      select: {
        domain: true,
        dmarc: true,
        dmarcRecord: true,
        dmarcLastChecked: true,
        spf: true,
        spfRecord: true,
        spfLastChecked: true,
        dkim: true,
        dkimSelector: true,
        dkimRecord: true,
        dkimLastChecked: true,
        sslStatus: true,
        sslIssuer: true,
        sslExpiry: true,
        sslLastChecked: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error: any) {
    console.error('Security status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

