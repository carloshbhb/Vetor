const https = require('https');
https.get('https://www.vetor.blog/', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    let i = -1, n = 0;
    while ((i = d.indexOf('<div class="container">', i + 1)) !== -1 && n++ < 50) {
      const after = d.slice(i, i + 80);
      if (/>\s*<\/div>/.test(after)) console.log('EMPTY at', i, JSON.stringify(d.slice(Math.max(0, i - 200), i + 60)));
    }
    // empty divs genericos
    const m = d.match(/<div[^>]*>\s*<\/div>/g);
    if (m) console.log('empty divs:', m.slice(0, 5));
  });
});
