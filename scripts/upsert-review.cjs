/**
 * upsert-review.cjs — Receives a JSON file path as argument, upserts review(s) to Supabase.
 * Usage: node scripts/upsert-review.cjs path/to/reviews.json
 *
 * The JSON file should contain an array of review objects.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function upsertReview(review) {
  const now = new Date().toISOString();

  // Fetch existing to preserve created_at
  const { data: existing } = await supabase
    .from('reviews')
    .select('created_at,status')
    .eq('slug', review.slug)
    .maybeSingle();

  const row = {
    slug: review.slug,
    status: review.status || existing?.status || 'published',
    product: review.product,
    category: review.category,
    marketplace: review.marketplace || 'mercadolivre',
    price_old: review.price_old || '',
    price_new: review.price_new || '',
    affiliate_url: review.affiliate_url || '',
    image_url: review.image_url || '',
    ads_enabled: review.ads_enabled ?? true,
    meta_title: review.meta_title || '',
    meta_description: review.meta_description || '',
    meta_keywords: review.meta_keywords || '',
    meta_reading_time: review.meta_reading_time || 8,
    hero_headline_line1: review.hero_headline_line1 || '',
    hero_headline_line2: review.hero_headline_line2 || '',
    hero_headline_em: review.hero_headline_em || '',
    hero_lead: review.hero_lead || '',
    hero_overall_score: review.hero_overall_score || review.verdict_score || 0,
    hero_bars: review.hero_bars || [],
    specs: review.specs || [],
    sections: review.sections || [],
    compare_table: review.compare_table || { rows: [], caption: '', columns: [], winnerCol: 0 },
    pros: review.pros || [],
    cons: review.cons || [],
    testimonials: review.testimonials || [],
    verdict_score: review.verdict_score || review.hero_overall_score || 0,
    verdict_label: review.verdict_label || '',
    verdict_text: review.verdict_text || '',
    verdict_note: review.verdict_note || '',
    schema_rating_value: review.schema_rating_value || (review.verdict_score ? review.verdict_score / 2 : 0),
    schema_review_count: review.schema_review_count || 1,
    created_at: existing?.created_at || now,
    updated_at: now,
    faq: review.faq || [],
  };

  const { data, error } = await supabase
    .from('reviews')
    .upsert(row, { onConflict: 'slug' })
    .select('slug')
    .single();

  if (error) {
    console.error(`  ✗ ${review.slug}: ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${review.slug} upserted`);
  return true;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/upsert-review.cjs <path-to-reviews.json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  let reviews;
  try {
    reviews = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(reviews)) reviews = [reviews];

  console.log(`Upserting ${reviews.length} reviews...`);
  let ok = 0, fail = 0;
  for (const r of reviews) {
    const success = await upsertReview(r);
    if (success) ok++; else fail++;
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
