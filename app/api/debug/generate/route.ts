import { NextResponse } from 'next/server';
import { handleAutonomousCycle } from '@/app/api/cron/autonomous-agent/route';

export async function GET() {
  try {
    const result = await handleAutonomousCycle();
    return result;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
