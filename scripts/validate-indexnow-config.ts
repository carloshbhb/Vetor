import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const key = process.env.INDEXNOW_API_KEY || process.env.INDEXNOW_KEY;
const host = (process.env.INDEXNOW_HOST || 'www.vetor.blog').trim().toLowerCase();

function fail(message: string): never {
  console.error('[IndexNow config] ' + message);
  process.exit(1);
}

if (!key) {
  fail('INDEXNOW_KEY / INDEXNOW_API_KEY is missing. Notification cannot be verified.');
}

if (host !== 'www.vetor.blog') {
  fail('INDEXNOW_HOST must match the canonical host www.vetor.blog.');
}

const publicDir = join(process.cwd(), 'public');
const candidates = readdirSync(publicDir).filter((filename) => /^[a-z0-9-]{8,128}\.txt$/i.test(filename));
const validMatches = candidates.filter((filename) => {
  const filenameKey = filename.slice(0, -4);
  const body = readFileSync(join(publicDir, filename), 'utf8').trim();
  return filenameKey === key && body === key;
});

if (validMatches.length !== 1) {
  fail(
    'The configured key does not match exactly one public/<key>.txt file. ' +
    'Publish the same key as the filename and file contents before notifying engines.'
  );
}

console.log('[IndexNow config] valid: canonical host, configured key and public key file match.');
