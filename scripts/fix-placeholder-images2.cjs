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

const MANUAL = {
  'apple-watch-series-9': 'https://www.apple.com/assets-www/pt_BR/watch/01_og/watch_og_4c76b09ff.png',
  'xiaomi-pad-6s-pro-review': 'https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-pad-6s-pro-124/pc/e22707982190cc2587fde3afa3d54567.jpg',
  'samsung-galaxy-book4-np750xgj-kg4br-completo': 'https://img.global.news.samsung.com/br/wp-content/uploads/2024/05/KV_GBOOK4_BASE_420x297_2.png',
  'top-7-fones-bluetooth-baratos-2026-com-frete-gratis': '/images/products/jbl-tune-520bt.webp',
  'melhores-air-fryers-compactas-2026-mondial-vs-philco-vs-electrolux': '/images/products/air-fryer-mondial-5-5l-2024.webp',
};

(async () => {
  for (const [slug, src] of Object.entries(MANUAL)) {
    let localPath = src;
    if (src.startsWith('http')) {
      const res = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) { console.log('FALHOU download', slug, res.status); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      localPath = path.join(OUT_DIR, `${slug}.webp`);
      await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(localPath);
      const meta = await sharp(localPath).metadata();
      console.log(`OK ${slug} ${meta.width}x${meta.height}`);
    }
    const target = src.startsWith('http') ? `/images/products/${slug}.webp` : src;
    const { error } = await sb.from('reviews').update({ image_url: target }).eq('slug', slug);
    if (error) console.log('UPDATE ERR', slug, error.message);
    else console.log('DB atualizado:', slug, '->', target);
  }
})();
