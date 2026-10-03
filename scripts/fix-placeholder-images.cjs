require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);
const OUT_DIR = path.join('public', 'images', 'products');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SLUGS = {
  'apple-watch-series-9': 'Apple Watch Series 9 GPS 45mm',
  'samsung-galaxy-book4-np750xgj-kg4br-completo': 'Samsung Galaxy Book4 NP750XGJ',
  'xiaomi-pad-6s-pro-review': 'Xiaomi Pad 6S Pro',
  'melhores-air-fryers-compactas-2026-mondial-vs-philco-vs-electrolux': 'Fritadeira Air Fryer Mondial 4L',
  'top-7-fones-bluetooth-baratos-2026-com-frete-gratis': 'Fone Bluetooth QCY',
};

async function mlThumb(query) {
  const res = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=5`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  for (const r of json.results || []) {
    const t = r.thumbnail?.replace('http:', 'https:');
    if (!t) continue;
    const noExt = t.replace(/-[A-Z]\.(webp|jpg)$/, '');
    for (const v of [`${noExt}-F.webp`, `${noExt}-V.webp`, `${noExt}-O.webp`, t]) {
      try {
        const r2 = await fetch(v);
        if (r2.ok) {
          const buf = Buffer.from(await r2.arrayBuffer());
          if (buf.length > 2000) return buf;
        }
      } catch {}
    }
  }
  return null;
}

(async () => {
  for (const [slug, query] of Object.entries(SLUGS)) {
    const buf = await mlThumb(query);
    if (!buf) { console.log('FALHOU:', slug); continue; }
    const target = path.join(OUT_DIR, `${slug}.webp`);
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
    const meta = await sharp(target).metadata();
    const { error } = await sb.from('reviews').update({ image_url: `/images/products/${slug}.webp` }).eq('slug', slug);
    console.log(error ? `UPDATE ERR ${slug}` : `OK ${slug} ${meta.width}x${meta.height}`);
  }
})();
