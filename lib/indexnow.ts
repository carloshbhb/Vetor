import { INDEXNOW_KEY, INDEXNOW_KEY_LOCATION } from '@/lib/env';

export async function submitUrl(url: string): Promise<boolean> {
  const key = INDEXNOW_KEY;
  if (!key) {
    console.warn('IndexNow key not configured; skipping submission');
    return false;
  }

  const keyLoc = INDEXNOW_KEY_LOCATION || `https://${new URL(url).host}/${key}.txt`;
  const parsed = new URL(url);
  const host = parsed.host;

  const payload = {
    host,
    key,
    urlList: [url],
    keyLocation: keyLoc,
  };

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('IndexNow request failed', res.status, await res.text());
      return false;
    }
    console.log('IndexNow: URL submitted successfully', url);
    return true;
  } catch (err) {
    console.error('IndexNow submission error', err);
    return false;
  }
}

export async function submitUrls(urls: string[]): Promise<{ success: number; failed: number }> {
  const key = INDEXNOW_KEY;
  if (!key) {
    console.warn('IndexNow key not configured');
    return { success: 0, failed: urls.length };
  }

  const keyLoc = INDEXNOW_KEY_LOCATION || '';
  const host = new URL(urls[0]).host;
  const payload = { host, key, urlList: urls, keyLocation: keyLoc };

  let success = 0;
  let failed = 0;

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      success = urls.length;
    } else {
      failed = urls.length;
      console.error('IndexNow batch failed', res.status);
    }
  } catch (err) {
    failed = urls.length;
    console.error('IndexNow batch error', err);
  }

  return { success, failed };
}

export async function notifyIndexNowOnUpdate(url: string): Promise<void> {
  await submitUrl(url);
}
