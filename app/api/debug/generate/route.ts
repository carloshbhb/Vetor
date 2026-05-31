import { NextResponse } from 'next/server';
import { handleAutonomousCycle } from '@/app/api/cron/autonomous-agent/route';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await handleAutonomousCycle();
    const response = result;
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
