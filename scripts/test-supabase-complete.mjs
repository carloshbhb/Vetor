import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

console.log('🔍 Testing Supabase connection...');
console.log('URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('📡 Testing basic connection...');
    const { data, error } = await supabase.from('reviews').select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Basic connection failed:', error);
      return false;
    }
    
    console.log('✅ Basic connection successful!');

    // Test 2: Table structure
    console.log('🔍 Testing table structure...');
    const { data: sampleData, error: structureError } = await supabase
      .from('reviews')
      .select('slug, product')
      .limit(1);
      
    if (structureError) {
      console.error('❌ Table structure error:', structureError);
      return false;
    }
    
    if (sampleData && sampleData.length > 0) {
      console.log('✅ Table structure is correct');
      console.log(`📋 Sample review: ${sampleData[0].product} (${sampleData[0].slug})`);
    } else {
      console.log('ℹ️ No data found in reviews table (this is normal for empty database)');
    }

    // Test 3: Test writing capability
    console.log('📝 Testing write capability...');
    const testReview = {
      slug: `test-connection-${Date.now()}`,
      status: 'draft',
      product: 'Test Product',
      category: 'Test Category',
      marketplace: 'Test Marketplace',
      price_old: 'R$ 100,00',
      price_new: 'R$ 90,00',
      affiliate_url: 'https://example.com',
      image_url: 'https://example.com/image.jpg',
      ads_enabled: false,
      meta_title: 'Test Review',
      meta_description: 'Test description',
      meta_keywords: 'test',
      meta_reading_time: 5,
      hero_headline_line1: 'Test',
      hero_headline_line2: 'Review',
      hero_headline_em: 'Test',
      hero_lead: 'Test content',
      hero_overall_score: 8.0,
      hero_bars: [],
      specs: [],
      sections: [],
      compare_table: {},
      pros: [],
      cons: [],
      testimonials: [],
      verdict_score: 8.0,
      verdict_label: 'Good',
      verdict_text: 'Test verdict',
      verdict_note: '',
      schema_rating_value: 8.0,
      schema_review_count: 1,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('reviews')
      .insert(testReview)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Write test failed:', insertError);
      return false;
    }

    console.log('✅ Write test successful!');
    console.log(`📝 Inserted test review: ${inserted.product}`);

    // Clean up - delete the test review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('slug', testReview.slug);

    if (deleteError) {
      console.error('⚠️ Cleanup warning:', deleteError);
    } else {
      console.log('✅ Test review cleaned up');
    }

    return true;
    
  } catch (error) {
    console.error('❌ Connection error:', error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('🎉 Supabase credentials are working perfectly!');
    console.log('✅ Ready to run migration: node scripts/migrate-to-supabase.mjs');
    console.log('📋 Migration will move all reviews from data/reviews.json to Supabase');
  } else {
    console.log('❌ Supabase connection failed.');
    console.log('🔧 Please check:');
    console.log('   1. Project URL is correct');
    console.log('   2. service_role key has permissions');
    console.log('   3. SQL schema has been executed in Supabase');
  }
}).catch(console.error);
