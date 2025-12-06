import { NextResponse } from 'next/server';
import { syncClientsFromNotion, getNotionSyncStatus } from '@/lib/notion';

export async function POST() {
  try {
    const result = await syncClientsFromNotion();
    
    return NextResponse.json({
      success: true,
      message: `Synced ${result.synced} clients (${result.created} new, ${result.updated} updated)`,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await getNotionSyncStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}


