import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Common compliance frameworks to seed
const PRESET_FRAMEWORKS = [
  // Security
  { name: 'SOC 2', category: 'SECURITY', description: 'Service Organization Control 2 - Trust Services Criteria' },
  { name: 'SOC 1', category: 'SECURITY', description: 'Service Organization Control 1 - Financial Reporting' },
  { name: 'SOC 3', category: 'SECURITY', description: 'Service Organization Control 3 - Public Report' },
  { name: 'ISO 27001', category: 'SECURITY', description: 'Information Security Management System' },
  { name: 'ISO 27017', category: 'SECURITY', description: 'Cloud Security Controls' },
  { name: 'ISO 27018', category: 'SECURITY', description: 'Cloud Privacy Controls' },
  { name: 'ISO 27701', category: 'SECURITY', description: 'Privacy Information Management' },
  { name: 'NIST CSF', category: 'SECURITY', description: 'NIST Cybersecurity Framework' },
  { name: 'NIST SP 800-53', category: 'SECURITY', description: 'Security and Privacy Controls' },
  { name: 'NIST SP 800-171', category: 'SECURITY', description: 'Protecting Controlled Unclassified Information' },
  { name: 'CSA STAR', category: 'SECURITY', description: 'Cloud Security Alliance STAR Certification' },
  { name: 'Cyber Essentials', category: 'SECURITY', description: 'UK Government Cybersecurity Certification' },
  
  // Privacy
  { name: 'GDPR', category: 'PRIVACY', description: 'General Data Protection Regulation (EU)' },
  { name: 'CCPA', category: 'PRIVACY', description: 'California Consumer Privacy Act' },
  { name: 'CPRA', category: 'PRIVACY', description: 'California Privacy Rights Act' },
  { name: 'HIPAA', category: 'PRIVACY', description: 'Health Insurance Portability and Accountability Act' },
  { name: 'PIPEDA', category: 'PRIVACY', description: 'Personal Information Protection (Canada)' },
  { name: 'LGPD', category: 'PRIVACY', description: 'Lei Geral de Proteção de Dados (Brazil)' },
  { name: 'Privacy Shield', category: 'PRIVACY', description: 'EU-US Privacy Shield Framework' },
  { name: 'FERPA', category: 'PRIVACY', description: 'Family Educational Rights and Privacy Act' },
  { name: 'COPPA', category: 'PRIVACY', description: 'Children\'s Online Privacy Protection Act' },
  
  // Government
  { name: 'FedRAMP High', category: 'GOVERNMENT', description: 'Federal Risk and Authorization Management Program - High' },
  { name: 'FedRAMP Moderate', category: 'GOVERNMENT', description: 'Federal Risk and Authorization Management Program - Moderate' },
  { name: 'FedRAMP Low', category: 'GOVERNMENT', description: 'Federal Risk and Authorization Management Program - Low' },
  { name: 'StateRAMP', category: 'GOVERNMENT', description: 'State Risk and Authorization Management Program' },
  { name: 'TX-RAMP', category: 'GOVERNMENT', description: 'Texas Risk and Authorization Management Program' },
  { name: 'CMMC', category: 'GOVERNMENT', description: 'Cybersecurity Maturity Model Certification' },
  { name: 'FISMA', category: 'GOVERNMENT', description: 'Federal Information Security Management Act' },
  { name: 'ITAR', category: 'GOVERNMENT', description: 'International Traffic in Arms Regulations' },
  { name: 'DoD IL4', category: 'GOVERNMENT', description: 'Department of Defense Impact Level 4' },
  { name: 'DoD IL5', category: 'GOVERNMENT', description: 'Department of Defense Impact Level 5' },
  
  // Industry
  { name: 'PCI DSS', category: 'INDUSTRY', description: 'Payment Card Industry Data Security Standard' },
  { name: 'HITRUST', category: 'INDUSTRY', description: 'Health Information Trust Alliance' },
  { name: 'GLBA', category: 'INDUSTRY', description: 'Gramm-Leach-Bliley Act (Financial)' },
  { name: 'SOX ITGC', category: 'INDUSTRY', description: 'Sarbanes-Oxley IT General Controls' },
  { name: 'FFIEC', category: 'INDUSTRY', description: 'Federal Financial Institutions Examination Council' },
  { name: 'TISAX', category: 'INDUSTRY', description: 'Trusted Information Security Assessment Exchange (Automotive)' },
  { name: 'COBIT', category: 'INDUSTRY', description: 'Control Objectives for Information Technologies' },
]

// POST /api/frameworks/seed - Seed preset frameworks
export async function POST() {
  try {
    let created = 0
    let skipped = 0

    for (const framework of PRESET_FRAMEWORKS) {
      // Check if framework already exists
      const existing = await db.framework.findUnique({
        where: { name: framework.name },
      })

      if (existing) {
        skipped++
        continue
      }

      await db.framework.create({
        data: {
          ...framework,
          category: framework.category as any,
          source: 'SEEDED',
          order: PRESET_FRAMEWORKS.indexOf(framework),
        },
      })
      created++
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${created} frameworks (${skipped} already existed)`,
      created,
      skipped,
    })
  } catch (error: any) {
    console.error('Error seeding frameworks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}







