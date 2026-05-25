// IndexNow integration for quick search engine indexing

/**
 * Submits a URL to the IndexNow service for immediate indexing.
 * Uses environment variables:
 *   - INDEXNOW_KEY: the secret key provided by the search engine.
 *   - INDEXNOW_KEY_LOCATION (optional): URL where the key file is hosted.
 *   - NEXT_PUBLIC_SITE_URL (fallback) for constructing the host.
 */
export async function submitUrl(url: string) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    // If no key is configured, silently ignore.
    console.warn('IndexNow key not configured; skipping submission');
    return;
  }

  const keyLocation = process.env.INDEXNOW_KEY_LOCATION;
  const parsed = new URL(url);
  const host = parsed.host;

  const payload: any = {
    host,
    key,
    urlList: [url],
  };
  if (keyLocation) payload.keyLocation = keyLocation;

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('IndexNow request failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('IndexNow submission error', err);
  }
}
