import { NextResponse } from 'next/server';
import { handleAutonomousCycle } from '@/app/api/cron/autonomous-agent/route';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const result = await handleAutonomousCycle();
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
