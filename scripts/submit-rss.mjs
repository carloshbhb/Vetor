// Submit RSS feed to Google Search Console + Indexing API
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JWT } from 'google-auth-library';

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
    let value = trimmed.slice(eqIndex + 1).trim().replace(/^"|"$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let rawKey = process.env.GOOGLE_PRIVATE_KEY;

if (!rawKey || !email) {
  console.error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  process.exit(1);
}

let privateKey = rawKey
  .replace(/\\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  .replace(/^"/, '').replace(/"$/, '').trim();
if (!privateKey.includes('-----BEGIN')) {
  privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
}

const jwtClient = new JWT({ email, key: privateKey, scopes: ['https://www.googleapis.com/auth/webmasters', 'https://www.googleapis.com/auth/indexing'] });
const token = await jwtClient.authorize();
const accessToken = token.access_token || '';

const baseUrl = SITE_URL.startsWith('http') ? SITE_URL : `https://${SITE_URL}`;
const rssUrl = `${baseUrl}/rss.xml`;

async function submitToGSC() {
  const encoded = encodeURIComponent(`${baseUrl}/rss.xml`);
  const res = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(baseUrl)}/sitemaps/${encoded}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204) console.log('RSS sitemap submitted to GSC successfully');
  else console.log('GSC result:', res.status, await res.text().catch(() => ''));
}

async function pingToIndexing() {
  const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ url: rssUrl, type: 'URL_UPDATED' }),
  });
  const data = await res.json();
  if (res.ok) console.log('RSS URL pinged to Indexing API successfully');
  else console.log('Indexing API result:', JSON.stringify(data));
}

async function main() {
  console.log(`RSS URL: ${rssUrl}`);
  await submitToGSC();
  await pingToIndexing();
}
main().catch(e => console.error(e.message));