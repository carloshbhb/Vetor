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

try {
  const token = await jwtClient.authorize();
  console.log('\nToken obtained successfully!');
  console.log('Token prefix:', token.access_token?.slice(0, 20) + '...');

  // Now index all pages
  const reviews = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'reviews.json'), 'utf8'))
    .filter(r => r.status === 'published');

  const urls = [
    SITE_URL,
    `${SITE_URL}/research`,
    `${SITE_URL}/sobre`,
    ...reviews.map(r => `${SITE_URL}/review/${r.slug}`),
  ];

  console.log(`\nIndexing ${urls.length} URLs...\n`);

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

  console.log(`\n=== Results ===`);
  console.log(`Indexed: ${indexed}`);
  console.log(`Errors: ${errors}`);
} catch (e) {
  console.error('\nAuth failed:', e.message);
}
