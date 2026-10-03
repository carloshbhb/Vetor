const { createClient } = require('@supabase/supabase-js');

const SOURCE_URL = 'https://jcfbkwnkruncefrnnwqv.supabase.co';
const SOURCE_KEY = process.env.SOURCE_SUPABASE_SERVICE_KEY || 'sb_publishable_SmaoFanNEMXGYBFqw-_eHQ_qQTnZ1a5';
const TARGET_URL = 'https://fzxumynocfqgvrovjuyf.supabase.co';

require('dotenv').config({ path: '.env.local' });
const targetKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function count(label, url, key) {
  const c = createClient(url, key);
  const { data, error, count } = await c
    .from('reviews')
    .select('id', { count: 'exact', head: true });
  if (error) {
    console.log(label, 'ERRO:', error.message);
    return;
  }
  console.log(label, 'reviews:', count);
  const pub = await c
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published');
  console.log(label, 'published:', pub.error ? 'erro ' + pub.error.message : pub.count);
}

(async () => {
  await count('SOURCE (antigo):', SOURCE_URL, SOURCE_KEY);
  await count('TARGET (atual):', TARGET_URL, targetKey);
})();
