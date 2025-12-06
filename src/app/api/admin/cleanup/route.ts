import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST() {
  // Require admin role
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    
    // Delete in order of dependencies
    
    // 1. Delete all check-related data
    const timerSessions = await db.timerSession.deleteMany({});
    const checkComments = await db.checkComment.deleteMany({});
    const itemResults = await db.itemResult.deleteMany({});
    const categoryResults = await db.categoryResult.deleteMany({});
    
    // 2. Delete all checks
    const checks = await db.infraCheck.deleteMany({});
    
    // 3. Delete template items and categories
    const templateItems = await db.templateItem.deleteMany({});
    const templateCategories = await db.templateCategory.deleteMany({});
    
    // 4. Delete templates
    const templates = await db.checkTemplate.deleteMany({});
    
    // 5. Delete demo users (keep any real users)
    const demoUsers = await db.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'example.com' } },
          { email: null },
        ]
      }
    });
    
    // Get remaining counts
    const remaining = {
      clients: await db.client.count(),
      users: await db.user.count(),
      templates: await db.checkTemplate.count(),
      checks: await db.infraCheck.count(),
    };
    
    return NextResponse.json({
      success: true,
      deleted: {
        timerSessions: timerSessions.count,
        checkComments: checkComments.count,
        itemResults: itemResults.count,
        categoryResults: categoryResults.count,
        checks: checks.count,
        templateItems: templateItems.count,
        templateCategories: templateCategories.count,
        templates: templates.count,
        demoUsers: demoUsers.count,
      },
      remaining,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

