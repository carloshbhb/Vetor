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

  // Fetch all URLs from sitemap
  async function getSitemapUrls() {
    const sitemapUrl = `${SITE_URL}/sitemap.xml`;
    console.log(`\nFetching sitemap: ${sitemapUrl}`);
    try {
      const response = await fetch(sitemapUrl);
      const xml = await response.text();
      const urls = [];
      const regex = /<loc>(.*?)<\/loc>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        urls.push(match[1]);
      }
      console.log(`Found ${urls.length} URLs in sitemap`);
      return urls;
    } catch (e) {
      console.error('Error fetching sitemap:', e.message);
      return [];
    }
  }

  const urls = await getSitemapUrls();

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

  // Submit all URLs to IndexNow as well
  console.log('\nSubmitting to IndexNow...');
  const indexNowResult = await submitIndexNow(urls);

  // Ping search engines about sitemap update
  console.log('\nPinging search engines...');
  await pingSearchEngines();

  console.log(`\n=== Results ===`);
  console.log(`Google Indexing API: ${indexed} indexed, ${errors} errors`);
  console.log(`IndexNow: ${indexNowResult.submitted} submitted`);
} catch (e) {
  console.error('\nAuth failed:', e.message);
}
