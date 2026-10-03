const https = require('https');
https.get('https://www.vetor.blog/reviews/melhores-notebooks-2026-top-2-guia-de-compra', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    console.log('status', r.statusCode, 'len', d.length);
    // procurar trechos suspeitos
    const idx = d.indexOf('<article');
    console.log(d.slice(idx, idx + 1200).replace(/></g, '>\n<'));
  });
});
