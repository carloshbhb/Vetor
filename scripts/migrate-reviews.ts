import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SOURCE (project you provided)
const SOURCE_URL = 'https://jcfbkwnkruncefrnnwqv.supabase.co';
const SOURCE_ANON_KEY = process.env.SOURCE_SUPABASE_ANON_KEY || 'sb_publishable_SmaoFanNEMXGYBFqw-_eHQ_qQTnZ1a5';
const SOURCE_SERVICE_KEY = process.env.SOURCE_SUPABASE_SERVICE_KEY || '';

// TARGET (current project .env.local)
const TARGET_URL = 'https://fzxumynocfqgvrovjuyf.supabase.co';
const TARGET_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const source = createClient(SOURCE_URL, SOURCE_SERVICE_KEY);
const target = createClient(TARGET_URL, TARGET_SERVICE_KEY);

interface Review {
  id?: string;
  slug: string;
  status: string;
  product: string;
  category: string;
  marketplace: string;
  price_old: string;
  price_new: string;
  affiliate_url: string;
  image_url: string;
  ads_enabled: boolean;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  meta_reading_time: number;
  meta_canonical: string | null;
  meta_og_image: string | null;
  hero_headline_line1: string;
  hero_headline_line2: string;
  hero_headline_em: string;
  hero_lead: string;
  hero_overall_score: number;
  hero_bars: any[];
  specs: any[];
  sections: any[];
  compare_table: any;
  pros: string[];
  cons: string[];
  testimonials: any[];
  verdict_score: number;
  verdict_label: string;
  verdict_text: string;
  verdict_note: string;
  schema_rating_value: number;
  schema_review_count: number;
  google_rank: number | null;
  last_rank_check: string | null;
  created_at: string;
  updated_at: string;
  faq: any[];
}

async function fetchAllReviewsFromSource(): Promise<Review[]> {
  console.log('📥 Fetching reviews from source project...');
  
  const { data, error } = await source
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Source fetch error: ${error.message}`);
  }

  console.log(`✅ Found ${data?.length || 0} reviews in source`);
  return data as Review[];
}

async function migrateReviews(reviews: Review[]) {
  console.log('\n📤 Migrating reviews to target project...');
  
  let success = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const review of reviews) {
    try {
      // Check if already exists in target
      const { data: existing } = await target
        .from('reviews')
        .select('slug')
        .eq('slug', review.slug)
        .single();

      if (existing) {
        console.log(`  ⏭️  Skipping ${review.slug} (already exists)`);
        skipped++;
        continue;
      }

      // Prepare data for insert (remove id, let target generate)
      const { id, ...insertData } = review;
      
      const { error } = await target
        .from('reviews')
        .insert(insertData);

      if (error) {
        throw new Error(error.message);
      }

      console.log(`  ✅ Migrated: ${review.product} (${review.slug})`);
      success++;

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100));

    } catch (err: any) {
      console.log(`  ❌ Failed: ${review.slug} - ${err.message}`);
      failed++;
      errors.push(`${review.slug}: ${err.message}`);
    }
  }

  return { success, skipped, failed, errors };
}

async function main() {
  console.log('🚀 Starting review migration');
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Target: ${TARGET_URL}\n`);

  try {
    const reviews = await fetchAllReviewsFromSource();
    
    if (reviews.length === 0) {
      console.log('No reviews to migrate.');
      return;
    }

    const result = await migrateReviews(reviews);

    console.log('\n📊 Migration Summary:');
    console.log(`  ✅ Success: ${result.success}`);
    console.log(`  ⏭️  Skipped: ${result.skipped}`);
    console.log(`  ❌ Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(e => console.log(`  - ${e}`));
    }

    // Save migration log
    const logPath = path.resolve(__dirname, 'migration-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      source: SOURCE_URL,
      target: TARGET_URL,
      total: reviews.length,
      ...result
    }, null, 2));
    console.log(`\n📝 Log saved to: ${logPath}`);

  } catch (err: any) {
    console.error('\n💥 Migration failed:', err.message);
    process.exit(1);
  }
}

main();