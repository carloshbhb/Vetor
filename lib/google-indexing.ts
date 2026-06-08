// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Google Indexing API Integration
// ─────────────────────────────────────────────────────────────────────────────
// Docs: https://developers.google.com/search/apis/indexing-api/v3/quickstart
//
// Requer variáveis de ambiente:
//   - GOOGLE_SERVICE_ACCOUNT_EMAIL: Email da conta de serviço
//   - GOOGLE_PRIVATE_KEY: Chave privada da conta de serviço
//   - NEXT_PUBLIC_SITE_URL: URL do site

import { createSign, createPrivateKey } from 'crypto';
import { GoogleAuth, JWT } from 'google-auth-library';

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;
const GOOGLE_API_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface IndexingResponse {
  success: boolean;
  urlNotificationMetadata?: {
    url: string;
    latestUpdate?: {
      notifyTime: string;
      type: string;
    };
  };
  error?: string;
}

function getPrivateKey(): string | null {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!rawKey) return null;

  // Normalizar a chave
  let key = rawKey
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^"/, '').replace(/"$/, '') // Remove wrapping quotes from Vercel env var
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Garantir headers PEM
  if (!key.includes('-----BEGIN')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
  }

  return key;
}

function base64url(data: Buffer | string): string {
  const str = typeof data === 'string' ? data : data.toString('base64');
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();

  if (!email || !privateKey) {
    throw new Error('Google credentials not found');
  }

  // Try google-auth-library first
  try {
    const jwtClient = new JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });
    const token = await jwtClient.authorize();
    return token.access_token || '';
  } catch (authError: any) {
    console.warn('[GoogleIndexing] google-auth-library failed, trying manual JWT:', authError?.message);
  }

  // Fallback: manual JWT
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  }));

  const dataToSign = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(dataToSign);
  const signature = sign.sign(privateKey, 'base64');
  const jwt = `${dataToSign}.${base64url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('[GoogleIndexing] Token exchange failed:', JSON.stringify(data));
    throw new Error(`Token exchange failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Envia URL para indexação/ atualização no Google
 */
export async function publishToGoogleIndexing(url: string, type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'): Promise<IndexingResponse> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url, type }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error?.message || JSON.stringify(data) };
    }

    return { success: true, urlNotificationMetadata: data };
  } catch (error: any) {
    console.error('Google Indexing API error:', error?.message);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Indexa todas as páginas importantes do site
 */
export async function indexAllPages(): Promise<{ indexed: number; errors: number }> {
  const { getPublishedReviews } = await import('./db');
  const reviews = await getPublishedReviews();

  let indexed = 0;
  let errors = 0;

  const homeResult = await publishToGoogleIndexing(SITE_URL);
  if (homeResult.success) indexed++;
  else errors++;

  const researchResult = await publishToGoogleIndexing(`${SITE_URL}/research`);
  if (researchResult.success) indexed++;
  else errors++;

  for (const review of reviews) {
    const url = `${SITE_URL}/review/${review.slug}`;
    const result = await publishToGoogleIndexing(url);
    if (result.success) indexed++;
    else errors++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { indexed, errors };
}

/**
 * Indexa um novo review quando publicado
 */
export async function indexNewReview(slug: string): Promise<IndexingResponse> {
  const url = `${SITE_URL}/review/${slug}`;
  return publishToGoogleIndexing(url, 'URL_UPDATED');
}
