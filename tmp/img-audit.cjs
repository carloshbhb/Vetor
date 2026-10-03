require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
(async () => {
  const { data } = await sb.from('reviews').select('slug,product,image_url,status').eq('status', 'published');
  let empty = 0, ml = 0, local = 0, other = 0;
  const emptyList = [];
  const mlExamples = new Set();
  for (const r of data) {
    const u = r.image_url || '';
    if (!u) { empty++; emptyList.push(r.slug); continue; }
    if (u.startsWith('/')) { local++; continue; }
    if (/mlstatic\.com/i.test(u)) { ml++; mlExamples.add(u.slice(0, 60)); continue; }
    other++;
  }
  console.log('total publicadas:', data.length);
  console.log('sem imagem:', empty, emptyList);
  console.log('ML thumbs:', ml, '| locais:', local, '| outros:', other);
  console.log('exemplos ML:', [...mlExamples].slice(0, 5));
})();
