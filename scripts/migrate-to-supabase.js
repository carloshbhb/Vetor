import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getAllReviews } from './lib/db.original.js';

// ─── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Supabase credentials not found in environment variables.');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

// ─── Data Transformation ─────────────────────────────────────────────────────
function transformReviewForSupabase(review) {
  return {
    slug: review.slug,
    status: review.status,
    product: review.product,
    category: review.category,
    marketplace: review.marketplace,
    price_old: review.priceOld,
    price_new: review.priceNew,
    affiliate_url: review.affiliateUrl,
    image_url: review.imageUrl,
    ads_enabled: review.adsEnabled,
    meta_title: review.meta?.title || '',
    meta_description: review.meta?.description || '',
    meta_keywords: review.meta?.keywords || '',
    meta_reading_time: review.meta?.readingTime || 0,
    meta_canonical: review.meta?.canonical || null,
    meta_og_image: review.meta?.ogImage || null,
    hero_headline_line1: review.hero?.headlineLine1 || '',
    hero_headline_line2: review.hero?.headlineLine2 || '',
    hero_headline_em: review.hero?.headlineEm || '',
    hero_lead: review.hero?.lead || '',
    hero_overall_score: review.hero?.overallScore || 0,
    hero_bars: review.hero?.bars || [],
    specs: review.specs || [],
    sections: review.sections || [],
    compare_table: review.compareTable || {},
    pros: review.pros || [],
    cons: review.cons || [],
    testimonials: review.testimonials || [],
    verdict_score: review.verdict?.score || 0,
    verdict_label: review.verdict?.label || '',
    verdict_text: review.verdict?.text || '',
    verdict_note: review.verdict?.note || '',
    schema_rating_value: review.schemaRating?.ratingValue || 0,
    schema_review_count: review.schemaRating?.reviewCount || 0,
    google_rank: review.googleRank || null,
    last_rank_check: review.lastRankCheck || null,
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  };
}

// ─── Migration Functions ────────────────────────────────────────────────────
async function checkExistingData() {
  console.log('🔍 Checking existing data in Supabase...');
  
  const { count, error } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('❌ Error checking existing data:', error);
    return 0;
  }

  console.log(`📊 Found ${count} existing reviews in Supabase.`);
  return count;
}

async function migrateReviews() {
  console.log('📖 Loading reviews from local JSON file...');
  
  try {
    const reviews = await getAllReviews();
    console.log(`✅ Loaded ${reviews.length} reviews from local file.`);
    
    if (reviews.length === 0) {
      console.log('⚠️ No reviews found to migrate.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const review of reviews) {
      console.log(`🔄 Migrating: ${review.product} (${review.slug})`);
      
      try {
        const transformed = transformReviewForSupabase(review);
        
        const { data, error } = await supabase
          .from('reviews')
          .upsert(transformed, {
            onConflict: 'slug',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to migrate ${review.product}:`, error);
          errorCount++;
        } else {
          console.log(`✅ Successfully migrated: ${data.product}`);
          successCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Error migrating ${review.product}:`, err);
        errorCount++;
      }
    }

    console.log('\n📋 Migration Summary:');
    console.log(`✅ Success: ${successCount} reviews`);
    console.log(`❌ Errors: ${errorCount} reviews`);
    console.log(`📊 Total processed: ${reviews.length} reviews`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...');
  
  try {
    const { data: localReviews, error: localError } = await getAllReviews();
    if (localError) {
      console.error('❌ Error loading local reviews:', localError);
      return;
    }

    const { data: supabaseReviews, error: supabaseError } = await supabase
      .from('reviews')
      .select('*');
    
    if (supabaseError) {
      console.error('❌ Error loading Supabase reviews:', supabaseError);
      return;
    }

    console.log(`📊 Local reviews: ${localReviews.length}`);
    console.log(`📊 Supabase reviews: ${supabaseReviews.length}`);
    
    // Check if all local reviews are in Supabase
    const localSlugs = new Set(localReviews.map(r => r.slug));
    const supabaseSlugs = new Set(supabaseReviews.map(r => r.slug));
    
    const missingSlugs = [...localSlugs].filter(slug => !supabaseSlugs.has(slug));
    
    if (missingSlugs.length > 0) {
      console.log(`⚠️ Reviews missing from Supabase: ${missingSlugs.join(', ')}`);
    } else {
      console.log('✅ All local reviews are present in Supabase!');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// ─── Main Execution ──────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting Supabase migration...\n');

  try {
    // Check if there's existing data
    const existingCount = await checkExistingData();
    
    if (existingCount > 0) {
      const response = await promptUser(`Found ${existingCount} existing reviews in Supabase. Do you want to continue? (y/N): `);
      if (response.toLowerCase() !== 'y') {
        console.log('❌ Migration cancelled by user.');
        return;
      }
    }

    // Perform the migration
    await migrateReviews();
    
    // Verify the results
    await verifyMigration();
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Helper function for user input
function promptUser(question) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question(question, (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

// Run the migration
main().catch(console.error);