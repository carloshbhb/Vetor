import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, saveSession } from '@/lib/mercadolivre-auth';

/**
 * Mercado Livre OAuth 2.0 Callback
 * This endpoint handles the OAuth redirect after user authorization
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('[ML OAuth] Authorization error:', error);
    return NextResponse.redirect(
      new URL(`/admin?error=ml_auth_failed&reason=${error}`, request.url)
    );
  }

  if (!code) {
    console.error('[ML OAuth] No authorization code received');
    return NextResponse.redirect(
      new URL('/admin?error=ml_no_code', request.url)
    );
  }

  try {
    const redirectUri = process.env.ML_REDIRECT_URI || `${request.nextUrl.origin}/api/ml/callback`;
    console.log('[ML OAuth] Exchanging code for token...');
    console.log('[ML OAuth] Redirect URI:', redirectUri);
    console.log('[ML OAuth] Has ML_CLIENT_ID:', !!process.env.ML_CLIENT_ID);
    console.log('[ML OAuth] Has ML_CLIENT_SECRET:', !!process.env.ML_CLIENT_SECRET);

    const tokenResponse = await exchangeCodeForToken(code, redirectUri);
    console.log('[ML OAuth] Token received, user_id:', tokenResponse.user_id);

    const session = await saveSession(tokenResponse);
    console.log('[ML OAuth] Session saved! User ID:', session.userId);

    return NextResponse.redirect(
      new URL('/admin?success=ml_authorized', request.url)
    );
  } catch (error) {
    console.error('[ML OAuth] Token exchange failed:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      new URL(`/admin?error=ml_token_exchange_failed&detail=${encodeURIComponent(detail)}`, request.url)
    );
  }
}
