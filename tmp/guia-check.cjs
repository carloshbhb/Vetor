const https = require('https');
const url = process.argv[2] || 'https://www.vetor.blog/reviews/melhores-notebooks-2026-top-2-guia-de-compra';
https.get(url, (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const css = [...d.matchAll(/href="(\/_next\/static\/css[^"]+)"/g)].map((m) => m[1]);
    console.log('css files:', css);
    const pCount = (d.match(/<p>/g) || []).length;
    const strongCount = (d.match(/<strong>/g) || []).length;
    console.log('<p> count:', pCount, '| <strong>:', strongCount);
    // primeiros parágrafos do corpo
    const i = d.indexOf('id="visao-geral"');
    console.log(d.slice(i, i + 600).replace(/></g, '>\n<'));
  });
});
