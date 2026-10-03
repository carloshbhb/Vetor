const https = require('https');
https.get('https://www.vetor.blog/reviews/categoria/Wearables', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    console.log('cards links:', (d.match(/href="\/reviews\//g) || []).length);
    console.log('h3:', (d.match(/<h3/g) || []).length, 'h1:', (d.match(/<h1/g) || []).length);
  });
});
