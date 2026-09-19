import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// SOURCE (project you provided)
const SOURCE_URL = 'https://jcfbkwnkruncefrnnwqv.supabase.co';
const SOURCE_SERVICE_KEY = process.env.SOURCE_SUPABASE_SERVICE_KEY || '';

// TARGET (current project .env.local)
const TARGET_URL = 'https://fzxumynocfqgvrovjuyf.supabase.co';
const TARGET_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const source = createClient(SOURCE_URL, SOURCE_SERVICE_KEY);
const target = createClient(TARGET_URL, TARGET_SERVICE_KEY);

async function compareSlugs() {
  console.log('🔍 Comparing slugs between source and target...\n');

  // Fetch all slugs from source
  const { data: sourceReviews, error: sourceError } = await source
    .from('reviews')
    .select('slug, product, category')
    .order('slug');

  if (sourceError) throw new Error(`Source error: ${sourceError.message}`);

  // Fetch all slugs from target
  const { data: targetReviews, error: targetError } = await target
    .from('reviews')
    .select('slug, product, category')
    .order('slug');

  if (targetError) throw new Error(`Target error: ${targetError.message}`);

  const sourceSlugs = new Map(sourceReviews.map(r => [r.slug, { product: r.product, category: r.category }]));
  const targetSlugs = new Map(targetReviews.map(r => [r.slug, { product: r.product, category: r.category }]));

  console.log(`Source: ${sourceSlugs.size} reviews`);
  console.log(`Target: ${targetSlugs.size} reviews\n`);

  // Check for missing in target
  const missingInTarget: string[] = [];
  const differentContent: string[] = [];

  for (const [slug, data] of sourceSlugs) {
    if (!targetSlugs.has(slug)) {
      missingInTarget.push(slug);
    } else {
      const targetData = targetSlugs.get(slug)!;
      if (targetData.product !== data.product || targetData.category !== data.category) {
        differentContent.push(`${slug}: source="${data.product}/${data.category}" target="${targetData.product}/${targetData.category}"`);
      }
    }
  }

  // Check for extra in target
  const extraInTarget: string[] = [];
  for (const [slug, data] of targetSlugs) {
    if (!sourceSlugs.has(slug)) {
      extraInTarget.push(`${slug}: ${data.product} (${data.category})`);
    }
  }

  // Report
  if (missingInTarget.length > 0) {
    console.log(`❌ MISSING IN TARGET (${missingInTarget.length}):`);
    missingInTarget.forEach(s => console.log(`  - ${s}: ${sourceSlugs.get(s)?.product}`));
  } else {
    console.log('✅ All source slugs exist in target');
  }

  if (differentContent.length > 0) {
    console.log(`\n⚠️ CONTENT MISMATCH (${differentContent.length}):`);
    differentContent.forEach(d => console.log(`  - ${d}`));
  } else {
    console.log('✅ All matching slugs have identical product/category');
  }

  if (extraInTarget.length > 0) {
    console.log(`\nℹ️ EXTRA IN TARGET (${extraInTarget.length}) - not in source:`);
    extraInTarget.forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('\n✅ No extra slugs in target');
  }

  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`  Source slugs: ${sourceSlugs.size}`);
  console.log(`  Target slugs: ${targetSlugs.size}`);
  console.log(`  Missing in target: ${missingInTarget.length}`);
  console.log(`  Content mismatches: ${differentContent.length}`);
  console.log(`  Extra in target: ${extraInTarget.length}`);
  console.log(`  Match: ${sourceSlugs.size - missingInTarget.length}/${sourceSlugs.size}`);

  return { missingInTarget, differentContent, extraInTarget };
}

compareSlugs().catch(console.error);