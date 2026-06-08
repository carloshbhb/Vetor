import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;
const PINTEREST_REDIRECT_URI = 'https://www.vetor.blog/api/pinterest/callback';

/**
 * Handles the OAuth callback from Pinterest.
 * Exchanges the authorization code for an access token.
 * Verifies state parameter for CSRF protection.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Verify state parameter for CSRF protection
  const storedState = req.cookies.get('pinterest_oauth_state')?.value;
  
  // Build redirect URL
  const redirectUrl = new URL('/admin/pinterest', req.url);

  // Clear the state cookie regardless of outcome
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete('pinterest_oauth_state');

  if (error) {
    console.error('[Pinterest OAuth] Authorization error:', error);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    console.error('[Pinterest OAuth] No authorization code received');
    redirectUrl.searchParams.set('error', 'no_code');
    return NextResponse.redirect(redirectUrl);
  }

  if (!state || state !== storedState) {
    console.error('[Pinterest OAuth] State mismatch - possible CSRF attack');
    redirectUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(redirectUrl);
  }

  if (!PINTEREST_CLIENT_ID || !PINTEREST_CLIENT_SECRET) {
    console.error('[Pinterest OAuth] PINTEREST_CLIENT_ID or PINTEREST_CLIENT_SECRET not configured');
    redirectUrl.searchParams.set('error', 'missing_config');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    console.log('[Pinterest OAuth] Exchanging authorization code for access token...');

    const credentials = Buffer.from(`${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`).toString('base64');

    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: PINTEREST_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[Pinterest OAuth] Token exchange failed:', tokenResponse.status);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      redirectUrl.searchParams.set('status', String(tokenResponse.status));
      return NextResponse.redirect(redirectUrl);
    }

    const tokenData = await tokenResponse.json();
    console.log('[Pinterest OAuth] Token received successfully');
    // SECURITY: Never log access tokens
    console.log('[Pinterest OAuth] Expires in:', tokenData.expires_in, 'seconds');

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    // Pass token via URL for one-time setup (client clears URL immediately)
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('token', tokenData.access_token);
    redirectUrl.searchParams.set('expires', encodeURIComponent(expiresAt));

    return NextResponse.redirect(redirectUrl);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Pinterest OAuth] Error:', message);
    redirectUrl.searchParams.set('error', encodeURIComponent(message));
    return NextResponse.redirect(redirectUrl);
  }
}
