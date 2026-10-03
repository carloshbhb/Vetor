const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_HOST = 'www.vetor.blog';
const PING_TIMEOUT_MS = 10_000;

export function buildContentUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `https://www.vetor.blog${normalized.endsWith('/') ? normalized : `${normalized}/`}`;
}

export async function pingIndexNow(urls: string[]): Promise<void> {
  const targets = urls
    .filter(Boolean)
    .map((url) => (url.endsWith('/') ? url : `${url}/`));
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

export async function pingNewContent(urls: string[]): Promise<void> {
  await pingIndexNow(urls);
}
