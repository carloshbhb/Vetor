import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_REDIRECT_URI = 'https://www.vetor.blog/api/pinterest/callback';

/**
 * Initiates the OAuth flow with Pinterest.
 * Redirects the user to Pinterest's authorization page.
 */
export async function GET(_req: NextRequest) {
  if (!PINTEREST_CLIENT_ID) {
    return NextResponse.json({ error: 'PINTEREST_CLIENT_ID not configured' }, { status: 500 });
  }

  const scopes = ['pins:read', 'pins:write', 'boards:write', 'boards:read'];
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', PINTEREST_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', PINTEREST_REDIRECT_URI);
  authUrl.searchParams.set('scope', scopes.join(','));
  authUrl.searchParams.set('state', state);

  console.log('[Pinterest Auth] Redirecting to:', authUrl.toString());

  return NextResponse.redirect(authUrl);
}
