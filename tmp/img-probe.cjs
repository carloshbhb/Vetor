require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const { data } = await sb.from('reviews').select('slug,image_url').eq('status', 'published').limit(5);
  for (const r of data) {
    if (!r.image_url || r.image_url.startsWith('/')) continue;
    const res = await fetch(r.image_url);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(r.slug, '| ct:', res.headers.get('content-type'), '| bytes:', buf.length, '| url:', r.image_url);
  }
})();
