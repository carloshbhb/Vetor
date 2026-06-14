import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  
  return NextResponse.json({
    hasSecret: !!cronSecret,
    secretLen: cronSecret?.length || 0,
    hasAuth: !!authHeader,
    authPrefix: authHeader?.substring(0, 10) || 'none',
    matches: authHeader === `Bearer ${cronSecret}`,
    allHeaders: Object.fromEntries(req.headers.entries()),
  });
}
