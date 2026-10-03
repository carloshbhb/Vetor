const https = require('https');
https.get('https://www.vetor.blog/reviews/apple-watch-series-9', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const i = d.indexOf('id="visao-geral"');
    console.log(d.slice(i, i + 800).replace(/></g, '>\n<'));
  });
}).on('error', (e) => console.log(e.message));
