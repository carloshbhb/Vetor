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

function variants(url) {
  const noExt = url.replace(/-[A-Z]\.(webp|jpg)$/, '');
  return [
    `${noExt}-F.webp`,
    `${noExt}-F.jpg`,
    `${noExt}-V.webp`,
    `${noExt}-O.webp`,
    url,
  ];
}

async function fetchBest(url) {
  for (const v of variants(url)) {
    try {
      const res = await fetch(v);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 2000) return buf;
      }
    } catch {}
  }
  return null;
}

(async () => {
  const { data: rows } = await sb
    .from('reviews')
    .select('slug,product,image_url')
    .eq('status', 'published');

  let ok = 0, fail = 0, skip = 0;
  for (const r of rows) {
    const u = r.image_url || '';
    if (!u || u.startsWith('/')) { skip++; continue; }
    const buf = await fetchBest(u);
    const target = path.join(OUT_DIR, `${r.slug}.webp`);
    if (!buf) {
      console.log('FALHOU download:', r.slug);
      fail++;
      continue;
    }
    try {
      await sharp(buf)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(target);
      const meta = await sharp(target).metadata();
      const sizeKb = Math.round(fs.statSync(target).size / 1024);
      const { error } = await sb
        .from('reviews')
        .update({ image_url: `/images/products/${r.slug}.webp` })
        .eq('slug', r.slug);
      if (error) { console.log('UPDATE ERR', r.slug, error.message); fail++; continue; }
      console.log(`OK ${r.slug} ${meta.width}x${meta.height} ${sizeKb}KB`);
      ok++;
    } catch (e) {
      console.log('SHARP ERR', r.slug, e.message);
      fail++;
    }
  }
  console.log(`\nSucesso: ${ok} | falhas: ${fail} | já locais: ${skip}`);
})();
