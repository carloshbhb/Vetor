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
  const state = searchParams.get('state');

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
    const redirectUri = `${request.nextUrl.origin}/api/ml/callback`;
    console.log('[ML OAuth] Exchanging code for token...');

    const tokenResponse = await exchangeCodeForToken(code, redirectUri);
    const session = saveSession(tokenResponse);

    console.log('[ML OAuth] Authorization successful! User ID:', session.userId);

    // Redirect to admin panel with success
    return NextResponse.redirect(
      new URL('/admin?success=ml_authorized', request.url)
    );
  } catch (error) {
    console.error('[ML OAuth] Token exchange failed:', error);
    return NextResponse.redirect(
      new URL('/admin?error=ml_token_exchange_failed', request.url)
    );
  }
}
