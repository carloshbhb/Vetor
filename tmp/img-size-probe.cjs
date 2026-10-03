const sharp = require('sharp');
const urls = [
  'https://http2.mlstatic.com/D_NQ_NP_2X_634182-MLA104773048853_012026-F.webp',
  'https://http2.mlstatic.com/D_NQ_NP_953893-MLA85310399911_052025-O.webp',
];
(async () => {
  for (const u of urls) {
    const base = u.replace(/\.webp$/, '');
    for (const suffix of ['', '.webp']) {
      for (const size of ['V', 'X', 'O', 'F', 'I']) {
        const candidate = base.replace(/-[A-Z]$/, '') + '-' + size + (size === 'I' ? '.jpg' : '.webp');
        try {
          const res = await fetch(candidate);
          if (!res.ok) continue;
          const buf = Buffer.from(await res.arrayBuffer());
          const meta = await sharp(buf).metadata();
          console.log(`${size} -> ${res.status} ${buf.length}B ${meta.width}x${meta.height}`);
        } catch (e) {}
      }
      break;
    }
  }
})();
