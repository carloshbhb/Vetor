require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  for (const term of ['Apple Watch%', 'Galaxy Book4%', 'Xiaomi Pad%', 'Xiaomi Pad 6S%']) {
    const { data } = await sb.from('reviews').select('slug,product,image_url').ilike('product', term).limit(10);
    for (const r of data || []) console.log(`[${term}]`, r.slug, '|', (r.image_url || '').slice(0, 60));
  }
  // também slug aproximado
  for (const s of ['apple%', 'book4%', 'pad-6s%']) {
    const { data } = await sb.from('reviews').select('slug,product,image_url').ilike('slug', s).limit(10);
    for (const r of data || []) console.log(`[slug ${s}]`, r.slug, '|', (r.image_url || '').slice(0, 60));
  }
})();
