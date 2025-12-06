import 'dotenv/config'
import { db } from '../src/lib/db'

async function addCalendarLinkColumn() {
  console.log('Adding calendarEventLink column to InfraCheck table...')
  
  try {
    await db.$executeRaw`
      ALTER TABLE "InfraCheck" 
      ADD COLUMN IF NOT EXISTS "calendarEventLink" TEXT
    `
    console.log('✅ Column added successfully!')
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('Column already exists, skipping...')
    } else {
      console.error('Error:', error)
    }
  } finally {
    await db.$disconnect()
  }
}

addCalendarLinkColumn()


