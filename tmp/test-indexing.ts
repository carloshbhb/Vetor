import { config } from 'dotenv';
import { pingNewContent } from '../src/lib/indexnow';

config({ path: '.env.local' });

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Usage: npx tsx tmp/test-indexing.ts <url> [url...]');
    process.exit(1);
  }

  const keyConfigured = Boolean(process.env.INDEXNOW_KEY || process.env.INDEXNOW_API_KEY);
  console.log('indexnow_key_configured=' + keyConfigured + ' url_count=' + urls.length);

  const result = await pingNewContent(urls, 'manual-indexnow-test');
  console.log('indexnow_status=' + result.status + ' http_status=' + (result.httpStatus ?? 'none'));

  if (result.status !== 'submitted') process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
