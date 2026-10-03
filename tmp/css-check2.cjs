const https = require('https');
https.get('https://www.vetor.blog/_next/static/css/ae78e02219691712.css', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    console.log('clamp(1.8rem:', d.includes('clamp(1.8rem'));
    console.log('.home-hero h1 count:', (d.match(/\.home-hero h1/g) || []).length);
    console.log('object-fit:contain:', (d.match(/object-fit:contain/g) || []).length);
    console.log('object-fit:cover count:', (d.match(/object-fit:cover/g) || []).length);
    console.log('h1{font-size:', d.match(/h1\{font-size:[^}]+\}/)?.[0]);
  });
});
