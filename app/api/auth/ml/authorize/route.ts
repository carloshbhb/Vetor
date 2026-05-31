import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI || 'https://vetor.blog/api/auth/ml/callback';

/**
 * Initiates the OAuth flow with Mercado Livre.
 * Redirects the user to Mercado Livre's authorization page.
 */
export async function GET(req: NextRequest) {
  if (!ML_CLIENT_ID) {
    return NextResponse.json({ error: 'ML_CLIENT_ID not configured' }, { status: 500 });
  }

  const authUrl = new URL('https://auth.mercadolivre.com.br/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', ML_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', ML_REDIRECT_URI);

  console.log('[ML Auth] Redirecting to:', authUrl.toString());

  return NextResponse.redirect(authUrl);
}
