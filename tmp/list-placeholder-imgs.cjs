require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const { data } = await sb
    .from('reviews')
    .select('slug,product,image_url')
    .eq('status', 'published');
  const placeholders = (data || []).filter((r) => !r.image_url || r.image_url.includes('placeholder'));
  console.log('com placeholder:', placeholders.length);
  for (const r of placeholders) console.log(' -', r.slug, '|', r.product);
})();
