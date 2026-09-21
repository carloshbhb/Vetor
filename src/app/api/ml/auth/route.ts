import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, hasValidSession, getSessionInfo } from '@/lib/mercadolivre-auth';

/**
 * Mercado Livre OAuth 2.0 - Start Authorization Flow
 * GET /api/ml/auth - Returns authorization URL
 * GET /api/ml/auth?status=true - Returns current session status
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  if (searchParams.get('status') === 'true') {
    const hasSession = await hasValidSession();
    const session = await getSessionInfo();

    return NextResponse.json({
      authenticated: hasSession,
      userId: session?.userId || null,
      expiresAt: session?.expiresAt || null,
    });
  }

  const redirectUri = process.env.ML_REDIRECT_URI || `${request.nextUrl.origin}/api/ml/callback`;
  const authUrl = getAuthorizationUrl(redirectUri);

  return NextResponse.json({
    authorizationUrl: authUrl,
    redirectUri,
    message: 'Visit the authorizationUrl to authorize the application',
  });
}
