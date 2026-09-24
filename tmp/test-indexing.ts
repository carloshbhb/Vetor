import { config } from 'dotenv';
import { pingGoogleIndexing, pingIndexNow } from '../src/lib/indexnow';

config({ path: '.env.local' });

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Usage: npx tsx tmp/test-indexing.ts <url> [url...]');
    process.exit(1);
  }

  const hasSa = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
  const hasKey = Boolean(process.env.GOOGLE_INDEXING_API_KEY);
  console.log(`service_account=${hasSa} legacy_key=${hasKey}`);

  await pingIndexNow(urls);
  await pingGoogleIndexing(urls);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
