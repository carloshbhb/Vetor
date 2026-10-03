const https = require('https');
https.get('https://www.vetor.blog/_next/static/css/ae78e02219691712.css', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    const i = d.indexOf('.article p');
    console.log('tem .article p:', i !== -1);
    console.log(d.slice(i, i + 200));
    const j = d.indexOf('.hero h1');
    console.log('tem .hero h1:', j !== -1);
    console.log('tem h1{clamp(1.8rem', /h1\{font-size:clamp\(1\.8rem/.test(d));
  });
});
