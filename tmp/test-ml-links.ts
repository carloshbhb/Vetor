/**
 * Diagnostic: ML session + product_links affiliate audit + meli link test
 * Usage: npx tsx tmp/test-ml-links.ts
 */
import { config } from 'dotenv';
import { hasValidSession, getValidAccessToken, getSessionInfo } from '../src/lib/mercadolivre-auth';
import { getProduct } from '../src/lib/mercadolivre-api';
import { generateTrackingUrl, extractProductId, generateAffiliateLink } from '../src/lib/mercadolivre-affiliate';
import { getAllProductLinks } from '../src/lib/product-links';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';

config({ path: '.env.local' });

function isMeliLike(url: string | null | undefined): boolean {
  if (!url) return false;
  return (
    url.includes('matt_tool=') ||
    url.includes('meli.') ||
    /meli\.com/i.test(url) ||
    /\/afiliados\//i.test(url)
  );
}

async function main() {
  console.log('=== ML LINK DIAGNOSTIC ===\n');

  // 1. Session
  const hasSession = await hasValidSession();
  const info = await getSessionInfo();
  console.log(`[1] hasValidSession: ${hasSession}`);
  console.log(`    userId: ${info?.userId ?? 'n/a'}`);
  console.log(`    expiresAt: ${info ? new Date(info.expiresAt).toISOString() : 'n/a'}`);
  console.log(`    tokenExpiredInMin: ${info ? Math.round((info.expiresAt - Date.now()) / 60000) : 'n/a'}`);

  // 2. Try token + one product
  let tokenOk = false;
  let sampleProduct: { id: string; permalink: string; title: string; price: number } | null = null;
  try {
    const token = await getValidAccessToken();
    tokenOk = token.length > 0;
    console.log(`[2] getValidAccessToken: OK (len=${token.length})`);
    const sample = await getProduct('MLB44102740'); // AirPods Pro 2 from seed
    sampleProduct = { id: sample.id, permalink: sample.permalink, title: sample.title, price: sample.price };
    console.log(`    getProduct: OK id=${sample.id}`);
    console.log(`    permalink: ${sample.permalink}`);
  } catch (e) {
    console.log(`[2] getValidAccessToken/getProduct FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. Tracking link test (needs trackingId — try env, else placeholder)
  const trackingId = process.env.ML_TRACKING_ID || process.env.ML_AFFILIATE_ID || 'TEST_TRACKING';
  if (sampleProduct) {
    const tracked = generateTrackingUrl(sampleProduct.permalink, trackingId, {
      campaign: 'vetor_blog',
      medium: 'video',
    });
    console.log(`[3] generateTrackingUrl (trackingId=${trackingId === 'TEST_TRACKING' ? '<placeholder>' : '<env>'}):`);
    console.log(`    ${tracked}`);
    const viaAffiliate = await generateAffiliateLink(sampleProduct.permalink, trackingId);
    console.log(`    generateAffiliateLink: ${viaAffiliate ? 'OK' : 'null'}`);
    if (viaAffiliate) {
      console.log(`    trackingUrl: ${viaAffiliate.trackingUrl}`);
    }
  } else {
    console.log('[3] skipped (no product)');
  }

  // 4. Audit product_links
  console.log('\n[4] product_links audit:');
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    console.log('    Supabase client not available');
  } else {
    const { data, error } = await supabase
      .from('product_links')
      .select('id, slug, product_name, product_url, affiliate_url, marketplace, status');
    if (error) {
      console.log(`    ERROR: ${error.message}`);
    } else {
      const rows = data ?? [];
      const ml = rows.filter((r) => (r.marketplace || 'mercadolivre') === 'mercadolivre');
      const missingAff = ml.filter((r) => !r.affiliate_url || r.affiliate_url.trim() === '');
      const nonMeliProduct = ml.filter((r) => !isMeliLike(r.product_url) && !isMeliLike(r.affiliate_url));
      const hasMeliAff = ml.filter((r) => isMeliLike(r.affiliate_url));
      const hasPlainML = ml.filter((r) => (r.product_url || '').includes('mercadolivre.com'));

      console.log(`    total rows: ${rows.length}`);
      console.log(`    marketplace=mercadolivre: ${ml.length}`);
      console.log(`    affiliate_url missing/empty: ${missingAff.length}`);
      console.log(`    affiliate_url already meli-like: ${hasMeliAff.length}`);
      console.log(`    product_url mercadolivre.com (plain): ${hasPlainML.length}`);
      console.log(`    neither product nor affiliate meli-like: ${nonMeliProduct.length}`);

      const sampleMissing = missingAff.slice(0, 5);
      if (sampleMissing.length) {
        console.log('    sample missing affiliate_url:');
        for (const r of sampleMissing) {
          console.log(`      - ${r.slug} | ${r.product_url}`);
        }
      }
      const sampleHasAff = ml.filter((r) => r.affiliate_url).slice(0, 3);
      if (sampleHasAff.length) {
        console.log('    sample with affiliate_url:');
        for (const r of sampleHasAff) {
          console.log(`      - ${r.slug} | aff=${r.affiliate_url}`);
        }
      }
    }
  }

  // 5. Check ml_tokens / ml_affiliate_links tables
  if (supabase) {
    console.log('\n[5] table existence:');
    for (const t of ['ml_tokens', 'ml_affiliate_links', 'product_links']) {
      const { error } = await supabase.from(t).select('*').limit(1);
      console.log(`    ${t}: ${error ? `ERROR ${error.message}` : 'OK'}`);
    }
  }

  // 6. Env keys present (names only)
  console.log('\n[6] env (names only):');
  for (const k of ['ML_CLIENT_ID', 'ML_CLIENT_SECRET', 'ML_REDIRECT_URI', 'ML_TRACKING_ID', 'ML_AFFILIATE_ID']) {
    console.log(`    ${k}: ${process.env[k] ? 'set' : 'missing'}`);
  }

  console.log('\n=== DONE ===');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
