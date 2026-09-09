import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const { JWT } = await import('google-auth-library');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let rawKey = process.env.GOOGLE_PRIVATE_KEY;
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;

if (!rawKey || !email) {
  console.error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  process.exit(1);
}

// Normalize key
let privateKey = rawKey
  .replace(/\\n/g, '\n')
  .replace(/\\r\\n/g, '\n')
  .replace(/\r\n/g, '\n')
  .replace(/\r/g, '\n')
  .replace(/^"/, '').replace(/"$/, '')
  .trim();

if (!privateKey.includes('-----BEGIN')) {
  privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

console.log('Email:', email);
console.log('Key lines:', privateKey.split('\n').length);
console.log('Key starts with:', privateKey.split('\n')[0]);

// Get token via google-auth-library
const jwtClient = new JWT({
  email,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/indexing'],
});

// ─── CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const MODE = args.includes('--full') ? 'full' : 'recent';
const CAP = 150; // Google Indexing API: ~200 req/dia
const RECENT_HOURS = 30;

console.log(`Mode: ${MODE} | Cap: ${CAP} | Recent window: ${RECENT_HOURS}h`);

// ─── IndexNow batch submission ─────────────────────────────────────────────
async function submitIndexNow(urls) {
  if (!INDEXNOW_KEY) {
    console.log('\nIndexNow key not configured, skipping IndexNow submission');
    return { submitted: 0 };
  }
  const parsed = new URL(SITE_URL);
  const host = parsed.host;

  // IndexNow supports batch submissions (up to 10,000 URLs)
  const batchSize = 1000;
  let submitted = 0;

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, key: INDEXNOW_KEY, urlList: batch }),
      });
      if (res.ok || res.status === 202) {
        submitted += batch.length;
        console.log(`  IndexNow: submitted batch of ${batch.length} URLs`);
      } else {
        console.log(`  IndexNow: failed (${res.status})`);
      }
    } catch (e) {
      console.log(`  IndexNow: error (${e.message})`);
    }
  }
  return { submitted };
}

// ─── Ping search engines ───────────────────────────────────────────────────
async function pingSearchEngines() {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;
  const endpoints = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  for (const url of endpoints) {
    try {
      await fetch(url);
      console.log(`  Pinged: ${url.split('?')[0].replace('https://', '')}`);
    } catch (e) {
      // best-effort
    }
  }
}

try {
  const token = await jwtClient.authorize();
  console.log('\nToken obtained successfully!');
  console.log('Token prefix:', token.access_token?.slice(0, 20) + '...');

  // Fetch URLs from sitemap with lastmod dates
  async function getSitemapUrls() {
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;
    console.log(`\nFetching sitemap: ${sitemapUrl}`);
    try {
      const response = await fetch(sitemapUrl);
      const xml = await response.text();
      const urls = [];
      // Extract <url> blocks with <loc> and optional <lastmod>
      const urlBlocks = xml.split('<url>').slice(1);
      for (const block of urlBlocks) {
        const locMatch = block.match(/<loc>(.*?)<\/loc>/);
        const lastmodMatch = block.match(/<lastmod>(.*?)<\/lastmod>/);
        if (locMatch) {
          urls.push({
            url: locMatch[1],
            lastmod: lastmodMatch ? new Date(lastmodMatch[1]).getTime() : 0,
          });
        }
      }
      console.log(`Found ${urls.length} URLs in sitemap`);
      return urls;
    } catch (e) {
      console.error('Error fetching sitemap:', e.message);
      return [];
    }
  }

  const allUrls = await getSitemapUrls();

  // Filter based on mode
  let urls;
  if (MODE === 'full') {
    urls = allUrls.map(u => u.url);
    console.log(`\nFull mode: submitting all ${urls.length} URLs`);
  } else {
    // Recent mode: only URLs updated in last RECENT_HOURS, static pages always
    const cutoff = Date.now() - RECENT_HOURS * 3600_000;
    const staticPaths = ['/', '/research', '/sobre', '/privacidade', '/termos'];
    const staticUrls = staticPaths.map(p => `${SITE_URL}${p}`);

    const recentUrls = allUrls
      .filter(u => u.lastmod >= cutoff || staticUrls.includes(u.url))
      .map(u => u.url);

    urls = recentUrls.slice(0, CAP);
    const skipped = allUrls.length - recentUrls.length;
    console.log(`\nRecent mode: ${recentUrls.length} recent (${skipped} skipped), capped at ${CAP}`);
    console.log(`Submitting ${urls.length} URLs`);
  }

  console.log(`\nSubmitting ${urls.length} URLs to Google Indexing API...\n`);

  let indexed = 0;
  let errors = 0;

  for (const url of urls) {
    process.stdout.write(`  ${url} ... `);
    try {
      const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.access_token}`,
        },
        body: JSON.stringify({ url, type: 'URL_UPDATED' }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log('OK');
        indexed++;
      } else {
        console.log(`FAIL (${data.error?.message || res.status})`);
        errors++;
      }
    } catch (e) {
      console.log(`ERROR (${e.message})`);
      errors++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Submit filtered URLs to IndexNow as well
  console.log('\nSubmitting to IndexNow...');
  const indexNowResult = await submitIndexNow(urls);

  // Ping search engines about sitemap update
  console.log('\nPinging search engines...');
  await pingSearchEngines();

  console.log(`\n=== Results ===`);
  console.log(`Mode: ${MODE}`);
  console.log(`Google Indexing API: ${indexed} indexed, ${errors} errors`);
  console.log(`IndexNow: ${indexNowResult.submitted} submitted`);
} catch (e) {
  console.error('\nAuth failed:', e.message);
}
