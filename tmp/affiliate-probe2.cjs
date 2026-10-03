require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const { data, error } = await sb
    .from('reviews')
    .select('slug,affiliate_url,image_url,status')
    .in('slug', ['apple-watch-series-9', 'samsung-galaxy-book4-np750xgj-kg4br-completo', 'xiaomi-pad-6s-pro-review']);
  console.log('error:', error?.message);
  for (const r of data || []) {
    console.log(r.slug, r.status);
    console.log('  affiliate:', (r.affiliate_url || '').slice(0, 90));
  }
})();
