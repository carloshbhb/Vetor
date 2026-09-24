/**
 * Rewrite non-meli affiliate links to ML matt_* tracking pattern.
 * Usage: npx tsx tmp/fix-meli-links.ts [--dry]
 */
import { config } from 'dotenv';
import { getSupabaseServiceKeyClient } from '../src/lib/supabase';

config({ path: '.env.local' });

const TRACKING_ID = process.env.ML_TRACKING_ID || 'carloshbhb';
const dryRun = process.argv.includes('--dry');

function isAlreadyMeli(url: string): boolean {
  return url.includes('matt_tool=') || url.includes('meli.la/');
}

function toMattiTracking(url: string): string {
  if (!url || isAlreadyMeli(url)) return url;
  if (!url.includes('mercadolivre.com') && !url.includes('meli.')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('matt_tool', TRACKING_ID);
    u.searchParams.set('matt_word', 'vetorblog');
    u.searchParams.set('ref', TRACKING_ID);
    u.searchParams.set('tracking_id', TRACKING_ID);
    return u.toString();
  } catch {
    return url;
  }
}

function isMlProductOrListUrl(url: string): boolean {
  return (
    url.includes('mercadolivre.com') &&
    !url.includes('meli.la/') &&
    !url.includes('matt_tool=') &&
    !url.includes('|||')
  );
}

async function main() {
  const supabase = getSupabaseServiceKeyClient();
  if (!supabase) {
    console.error('No Supabase client');
    process.exit(1);
  }

  console.log(`trackingId=${TRACKING_ID === 'carloshbhb' ? '<default>' : '<env>'} dryRun=${dryRun}\n`);

  // ── product_links ──
  const { data: pl, error: plErr } = await supabase
    .from('product_links')
    .select('id, slug, product_url, affiliate_url');
  if (plErr) {
    console.error('product_links select error:', plErr.message);
    process.exit(1);
  }

  const plUpdates: { id: string; slug: string; affiliate_url: string }[] = [];
  for (const row of pl ?? []) {
    const current = row.affiliate_url || '';
    if (isAlreadyMeli(current)) continue;
    const base = row.product_url || current;
    if (!base.includes('mercadolivre.com')) continue;
    const next = toMattiTracking(base);
    if (next !== current) {
      plUpdates.push({ id: row.id, slug: row.slug, affiliate_url: next });
    }
  }

  console.log(`product_links: ${pl?.length ?? 0} total, ${plUpdates.length} need update`);

  let plOk = 0;
  let plFail = 0;
  if (!dryRun && plUpdates.length) {
    for (const u of plUpdates) {
      const { error } = await supabase
        .from('product_links')
        .update({ affiliate_url: u.affiliate_url, updated_at: new Date().toISOString() })
        .eq('id', u.id);
      if (error) {
        plFail++;
        console.error(`  FAIL ${u.slug}: ${error.message}`);
      } else {
        plOk++;
      }
    }
  }

  // ── reviews (plain ML only; leave meli.la / multi ||| / non-ML) ──
  const { data: rev, error: revErr } = await supabase
    .from('reviews')
    .select('slug, affiliate_url');
  if (revErr) {
    console.error('reviews select error:', revErr.message);
    process.exit(1);
  }

  const revUpdates: { slug: string; affiliate_url: string }[] = [];
  for (const row of rev ?? []) {
    const current = row.affiliate_url || '';
    if (!current || isAlreadyMeli(current)) continue;
    if (!isMlProductOrListUrl(current)) continue;
    const next = toMattiTracking(current);
    if (next !== current) {
      revUpdates.push({ slug: row.slug, affiliate_url: next });
    }
  }

  console.log(`reviews: ${rev?.length ?? 0} total, ${revUpdates.length} need update`);
  if (revUpdates.length) {
    console.log('  samples:');
    for (const u of revUpdates.slice(0, 3)) {
      console.log(`    ${u.slug}\n      old→ need review\n      new: ${u.affiliate_url}`);
    }
  }

  let revOk = 0;
  let revFail = 0;
  if (!dryRun && revUpdates.length) {
    for (const u of revUpdates) {
      const { error } = await supabase
        .from('reviews')
        .update({ affiliate_url: u.affiliate_url, updated_at: new Date().toISOString() })
        .eq('slug', u.slug);
      if (error) {
        revFail++;
        console.error(`  FAIL ${u.slug}: ${error.message}`);
      } else {
        revOk++;
      }
    }
  }

  // ── verify ──
  const { data: plAfter } = await supabase.from('product_links').select('affiliate_url');
  const { data: revAfter } = await supabase.from('reviews').select('affiliate_url');
  const plMeli = (plAfter ?? []).filter((r) => r.affiliate_url && isAlreadyMeli(r.affiliate_url)).length;
  const revMeli = (revAfter ?? []).filter((r) => r.affiliate_url && isAlreadyMeli(r.affiliate_url)).length;
  const revPlain = (revAfter ?? [])
    .filter((r) => r.affiliate_url && isMlProductOrListUrl(r.affiliate_url)).length;

  console.log(`\n${'='.repeat(50)}`);
  console.log(dryRun ? 'DRY RUN (no writes)' : 'Write summary:');
  console.log(`  product_links updated: ${plOk} fail: ${plFail}`);
  console.log(`  reviews updated: ${revOk} fail: ${revFail}`);
  console.log(`  after → product_links meli-like: ${plMeli}/${plAfter?.length ?? 0}`);
  console.log(`  after → reviews meli-like: ${revMeli}/${revAfter?.length ?? 0}`);
  console.log(`  after → reviews plain ML remaining: ${revPlain}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
