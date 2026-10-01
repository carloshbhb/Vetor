import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

const BROKEN_SLUGS = [
  'apple-watch-series-9',
  'redmi-watch-5',
  'airpods-pro-2',
  'sony-wf-1000xm5',
  'samsung-galaxy-book4-np750xgj-kg4br-completo',
  '8-mais-vendidor-299r-15647-offfrete-grtis-parafusadeira-e-furadeira-impacto-the-black-tools-tb-',
  '20-mais-vendidor-669r-4965225-offfrete-grtis-micro-ondas-mondial-21l-1200w-mo-01-21-e-espelhado',
  'top-7-fones-bluetooth-baratos-2026-com-frete-gratis',
  'melhores-air-fryers-compactas-2026-mondial-vs-philco-vs-electrolux',
  'intelbras-im3c',
  'macbook-air-m3',
  'xiaomi-mi-band-9',
  'xiaomi-pad-6s-pro-review',
];

async function mlThumbnail(query: string): Promise<string | null> {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const json = await res.json();
  for (const r of json.results || []) {
    const thumb: string | undefined = r.thumbnail?.replace('http:', 'https:');
    if (!thumb) continue;
    try {
      const head = await fetch(thumb, { method: 'HEAD' });
      if (head.ok) return thumb;
    } catch { /* try next */ }
  }
  return null;
}

(async () => {
  const { data: reviews } = await sb
    .from('reviews')
    .select('slug,product,image_url')
    .in('slug', BROKEN_SLUGS);
  console.log('found:', reviews?.length);
  for (const r of reviews || []) {
    const thumb = await mlThumbnail(r.product);
    console.log(r.slug, '=>', thumb || 'NO-RESULT (placeholder fallback)');
    if (thumb) {
      const { error } = await sb.from('reviews').update({ image_url: thumb }).eq('slug', r.slug);
      if (error) console.log('  UPDATE ERR', error.message);
    }
  }
})();
