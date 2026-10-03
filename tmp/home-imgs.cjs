require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  // replicar query da home
  const { data: latest } = await sb
    .from('reviews')
    .select('slug,product,image_url,status,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(6);
  for (const r of latest || []) {
    console.log(r.slug, '->', JSON.stringify(r.image_url).slice(0, 70));
  }
})();
