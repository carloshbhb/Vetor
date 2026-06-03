import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
const ML_REDIRECT_URI = 'https://www.vetor.blog/api/auth/ml/callback';

/**
 * Handles the OAuth callback from Mercado Livre.
 * Exchanges the authorization code for an access token.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('[ML OAuth] Authorization error:', error);
    return NextResponse.redirect(new URL(`/admin?ml_error=${error}`, req.url));
  }

  if (!code) {
    console.error('[ML OAuth] No authorization code received');
    return NextResponse.redirect(new URL('/admin?ml_error=no_code', req.url));
  }

  if (!ML_CLIENT_ID || !ML_CLIENT_SECRET) {
    console.error('[ML OAuth] ML_CLIENT_ID or ML_CLIENT_SECRET not configured');
    return NextResponse.redirect(new URL('/admin?ml_error=missing_config', req.url));
  }

  try {
    console.log('[ML OAuth] Exchanging authorization code for access token...');

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[ML OAuth] Token exchange failed:', tokenResponse.status, errorData);
      return NextResponse.redirect(new URL(`/admin?ml_error=token_exchange_failed&status=${tokenResponse.status}`, req.url));
    }

    const tokenData = await tokenResponse.json();
    console.log('[ML OAuth] Token received successfully');
    console.log('[ML OAuth] Access Token:', tokenData.access_token);
    console.log('[ML OAuth] Refresh Token:', tokenData.refresh_token);
    console.log('[ML OAuth] Expires in:', tokenData.expires_in, 'seconds');

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });

  } catch (error: any) {
    console.error('[ML OAuth] Error:', error.message);
    return NextResponse.redirect(new URL(`/admin?ml_error=${encodeURIComponent(error.message)}`, req.url));
  }
}
