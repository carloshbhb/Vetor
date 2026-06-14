import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  
  const masked = cronSecret 
    ? `${cronSecret.substring(0, 4)}...${cronSecret.substring(cronSecret.length - 4)} (len=${cronSecret.length})`
    : 'NOT SET';
  
  const authMasked = authHeader
    ? `${authHeader.substring(0, 15)}...`
    : 'NOT PROVIDED';

  const matches = authHeader === `Bearer ${cronSecret}`;

  return NextResponse.json({
    cronSecretStatus: masked,
    authHeaderProvided: !!authHeader,
    authHeaderPreview: authMasked,
    matches,
    nodeEnv: process.env.NODE_ENV,
  });
}
