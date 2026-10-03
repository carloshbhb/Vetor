require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const slugs = ['apple-watch-series-9', 'samsung-galaxy-book4-np750xgj-kg4br-completo', 'xiaomi-pad-6s-pro-review', 'top-7-fones-bluetooth-baratos-2026-com-frete-gratis', 'melhores-air-fryers-compactas-2026-mondial-vs-philco-vs-electrolux'];
  const { data } = await sb.from('reviews').select('slug,affiliate_url,product_url,image_url').in('slug', slugs);
  for (const r of data || []) {
    console.log(r.slug);
    console.log('  affiliate:', (r.affiliate_url || '').slice(0, 80));
    console.log('  product:', (r.product_url || '').slice(0, 80));
  }
})();
