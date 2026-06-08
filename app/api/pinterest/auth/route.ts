import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_REDIRECT_URI = 'https://www.vetor.blog/api/pinterest/callback';

/**
 * Initiates the OAuth flow with Pinterest.
 * Redirects the user to Pinterest's authorization page.
 * Stores state in cookie for CSRF verification.
 */
export async function GET(_req: NextRequest) {
  if (!PINTEREST_CLIENT_ID) {
    return NextResponse.json({ error: 'PINTEREST_CLIENT_ID not configured' }, { status: 500 });
  }

  const scopes = ['pins:read', 'pins:write', 'boards:write', 'boards:read'];
  const state = crypto.randomUUID();

  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', PINTEREST_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', PINTEREST_REDIRECT_URI);
  authUrl.searchParams.set('scope', scopes.join(','));
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl);

  // Store state in HTTP-only cookie for CSRF verification
  response.cookies.set('pinterest_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
