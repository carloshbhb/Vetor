const https = require('https');
(async () => {
  for (const u of ['https://www.vetor.blog/comparativos', 'https://www.vetor.blog/guias']) {
    const html = await new Promise((r) =>
      https.get(u, (x) => {
        let d = '';
        x.on('data', (c) => (d += c));
        x.on('end', () => r(d));
      })
    );
    const comp = [...new Set((html.match(/\/comparativos\/[a-z0-9-]+\/?/g) || []))].filter(
      (s) => s !== '/comparativos/' && s !== '/comparativos'
    );
    console.log(u, '->', comp.slice(0, 5));
  }
})();
