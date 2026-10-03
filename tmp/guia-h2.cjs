const https = require('https');
const url = process.argv[2];
https.get(url, (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const h2s = [...d.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
      m[1].replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, '').trim()
    );
    console.log('H2s:');
    for (const h of h2s) console.log(' -', h);
    // duplicatas
    const seen = {};
    for (const h of h2s) seen[h] = (seen[h] || 0) + 1;
    console.log('\nDuplicados:');
    for (const [h, n] of Object.entries(seen)) if (n > 1) console.log(` (${n}x)`, h);
  });
});
