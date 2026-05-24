import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERROR: Supabase credentials not found in environment variables.');
  console.log('Please check your .env.local file');
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
    // Test basic connection by listing tables
    console.log('📡 Testing database connection...');
    
    const { data, error, count } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log(`📊 Found ${count} reviews in Supabase`);
    
    // Test if table exists and has expected structure
    console.log('🔍 Checking table structure...');
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
      console.log('ℹ️ No data found in reviews table');
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
    console.log('🎉 Supabase credentials are working correctly!');
    console.log('✅ Ready to run migration: node scripts/migrate-to-supabase.mjs');
  } else {
    console.log('❌ Supabase credentials need verification.');
    console.log('🔧 Please check:');
    console.log('   1. Project URL is correct');
    console.log('   2. service_role key has permissions');
    console.log('   3. SQL schema has been executed in Supabase');
  }
}).catch(console.error);