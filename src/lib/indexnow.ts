import { createPrivateKey, createSign } from 'node:crypto';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_HOST = 'www.vetor.blog';
const DEFAULT_BASE_URL = 'https://www.vetor.blog';
const GOOGLE_INDEXING_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
const PING_TIMEOUT_MS = 10_000;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export function buildContentUrl(path: string): string {
  return `${DEFAULT_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

async function mintServiceAccountJwt(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!email || !privateKeyRaw) return null;

  const privateKey = createPrivateKey(normalizePrivateKey(privateKeyRaw));
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: GOOGLE_INDEXING_SCOPE,
      aud: GOOGLE_TOKEN_ENDPOINT,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
}

async function getGoogleAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const jwt = await mintServiceAccountJwt();
  if (!jwt) {
    const legacy = process.env.GOOGLE_INDEXING_API_KEY?.trim();
    return legacy || null;
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.log(`[Google Indexing] token exchange failed with status ${res.status}`);
      return null;
    }

    const data = (await res.json()) as GoogleTokenResponse;
    if (!data.access_token) {
      console.log('[Google Indexing] token exchange returned no access_token');
      return null;
    }

    const ttlMs = Math.max(60_000, ((data.expires_in ?? 3600) - 120) * 1000);
    cachedToken = { value: data.access_token, expiresAt: Date.now() + ttlMs };
    return data.access_token;
  } catch (err) {
    console.log(
      '[Google Indexing] token exchange error:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

export async function pingIndexNow(urls: string[]): Promise<void> {
  const targets = urls.filter(Boolean);
  if (targets.length === 0) return;

  const key = process.env.INDEXNOW_KEY || process.env.INDEXNOW_API_KEY;
  if (!key) return;

  const host = process.env.INDEXNOW_HOST || DEFAULT_HOST;
  const keyLocation = `https://${host}/${key}.txt`;

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation, urlList: targets }),
      signal: AbortSignal.timeout(PING_TIMEOUT_MS),
    });

    if (res.ok) {
      console.log(`[IndexNow] pinged ${targets.length} url(s)`);
    } else {
      console.log(`[IndexNow] ping failed with status ${res.status}`);
    }
  } catch (err) {
    console.log('[IndexNow] ping error:', err instanceof Error ? err.message : String(err));
  }
}

export async function pingGoogleIndexing(urls: string[]): Promise<void> {
  const targets = urls.filter(Boolean);
  if (targets.length === 0) return;

  const hasServiceAccount =
    Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()) &&
    Boolean(process.env.GOOGLE_PRIVATE_KEY?.trim());
  const hasLegacyKey = Boolean(process.env.GOOGLE_INDEXING_API_KEY?.trim());
  if (!hasServiceAccount && !hasLegacyKey) return;

  const token = await getGoogleAccessToken();
  if (!token) {
    console.log('[Google Indexing] skipped: no access token');
    return;
  }

  for (const url of targets) {
    try {
      const res = await fetch(GOOGLE_INDEXING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, type: 'URL_UPDATED' }),
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });

      if (res.ok) {
        console.log(`[Google Indexing] pinged ${url}`);
      } else {
        const body = await res.text().catch(() => '');
        console.log(
          `[Google Indexing] ping failed for ${url} with status ${res.status}${
            body ? ` ${body.slice(0, 200)}` : ''
          }`
        );
      }
    } catch (err) {
      console.log(
        '[Google Indexing] ping error:',
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

export async function pingNewContent(urls: string[]): Promise<void> {
  const targets = urls.filter(Boolean);
  if (targets.length === 0) return;

  await pingIndexNow(targets);
  await pingGoogleIndexing(targets);
}
