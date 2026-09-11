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
import { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, NEXT_PUBLIC_SITE_URL } from '@/lib/env';

const SITE_URL = NEXT_PUBLIC_SITE_URL.startsWith('http') ? NEXT_PUBLIC_SITE_URL : `https://${NEXT_PUBLIC_SITE_URL}`;
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
  const rawKey = GOOGLE_PRIVATE_KEY;
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
  const email = GOOGLE_SERVICE_ACCOUNT_EMAIL;
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
 * Indexa SÓ o que mudou (incremental) — uso correto da API dentro da cota.
 * - Reviews criados/atualizados nas últimas `recentHours` (padrão 8h);
 * - Páginas estáticas + categorias só 1x/semana (segunda UTC) ou com `full=true`;
 * - Teto de `cap` URLs por execução (padrão 90, cota diária = 200).
 * Motivo: a API tem ~200 publishes/dia; 2 runs × 90 = 180, sobra margem para
 * autonomous-agent (2 publishes/dia). recentHours=8 evita overlap entre runs.
 */
export async function indexAllPages(opts?: {
  recentHours?: number;
  cap?: number;
  full?: boolean;
}): Promise<{ indexed: number; errors: number; skipped: number }> {
  const { getPublishedReviewCards } = await import('./db');
  const cards = await getPublishedReviewCards();

  const recentHours = opts?.recentHours ?? Number(process.env.INDEXING_RECENT_HOURS || 8);
  const cap = opts?.cap ?? Number(process.env.INDEXING_CAP || 90);
  const full = opts?.full ?? process.env.INDEXING_FULL === 'true';
  const isMonday = new Date().getUTCDay() === 1;

  let indexed = 0;
  let errors = 0;
  const send = async (url: string) => {
    if (indexed + errors >= cap) return;
    const result = await publishToGoogleIndexing(url);
    if (result.success) indexed++;
    else errors++;
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  // Helper to slugify category names (same logic as sitemap)
  function slugify(s: string): string {
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const cutoff = Date.now() - recentHours * 3600_000;
  const fresh = full
    ? cards
    : cards.filter(r => {
        const created = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        const updated = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
        return Math.max(created, updated) >= cutoff;
      });

  // Review pages (só novas/alteradas)
  for (const review of fresh) {
    await send(`${SITE_URL}/review/${review.slug}`);
  }

  // Estáticas + categorias: só no full ou 1x/semana (mudam raramente)
  if (full || isMonday) {
    const staticPaths = ['/', '/research', '/sobre', '/privacidade', '/termos'];
    for (const path of staticPaths) {
      await send(`${SITE_URL}${path}`);
    }
    const categories = Array.from(new Set(cards.map(r => r.category || 'Geral')));
    for (const cat of categories) {
      await send(`${SITE_URL}/categoria/${slugify(cat)}`);
    }
  }

  const skipped = full ? 0 : cards.length - fresh.length;
  return { indexed, errors, skipped };
}

/**
 * Indexa um novo review quando publicado
 */
export async function indexNewReview(slug: string): Promise<IndexingResponse> {
  const url = `${SITE_URL}/review/${slug}`;
  return publishToGoogleIndexing(url, 'URL_UPDATED');
}
