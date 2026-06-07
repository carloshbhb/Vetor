import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET;
const PINTEREST_REDIRECT_URI = 'https://www.vetor.blog/api/pinterest/callback';

/**
 * Handles the OAuth callback from Pinterest.
 * Exchanges the authorization code for an access token.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error) {
    console.error('[Pinterest OAuth] Authorization error:', error);
    return NextResponse.redirect(new URL(`/admin/pinterest?error=${error}`, req.url));
  }

  if (!code) {
    console.error('[Pinterest OAuth] No authorization code received');
    return NextResponse.redirect(new URL('/admin/pinterest?error=no_code', req.url));
  }

  if (!PINTEREST_CLIENT_ID || !PINTEREST_CLIENT_SECRET) {
    console.error('[Pinterest OAuth] PINTEREST_CLIENT_ID or PINTEREST_CLIENT_SECRET not configured');
    return NextResponse.redirect(new URL('/admin/pinterest?error=missing_config', req.url));
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
      const errorData = await tokenResponse.text();
      console.error('[Pinterest OAuth] Token exchange failed:', tokenResponse.status, errorData);
      return NextResponse.redirect(new URL(`/admin/pinterest?error=token_exchange_failed&status=${tokenResponse.status}`, req.url));
    }

    const tokenData = await tokenResponse.json();
    console.log('[Pinterest OAuth] Token received successfully');
    console.log('[Pinterest OAuth] Access Token:', tokenData.access_token);
    console.log('[Pinterest OAuth] Expires in:', tokenData.expires_in, 'seconds');

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

    return NextResponse.redirect(
      new URL(`/admin/pinterest?success=true&token=${encodeURIComponent(tokenData.access_token)}&expires=${encodeURIComponent(expiresAt)}`, req.url)
    );

  } catch (error: any) {
    console.error('[Pinterest OAuth] Error:', error.message);
    return NextResponse.redirect(new URL(`/admin/pinterest?error=${encodeURIComponent(error.message)}`, req.url));
  }
}
