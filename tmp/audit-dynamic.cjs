const https = require('https');
const routes = [
  '/reviews/samsung-galaxy-fit3',
  '/reviews/robo-aspirador-eufy-g10-hybrid',
  '/reviews/categoria/Wearables',
  '/reviews/categoria/Eletronicos',
  '/tags/headset-gamer',
  '/author/editor-vetor',
  '/reviews/melhores-fones-de-ouvido-2026-top-3-guia-de-compra',
];
function get(path) {
  return new Promise((resolve) => {
    https.get('https://www.vetor.blog' + path, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => resolve({ path, status: r.statusCode, html: d }));
    }).on('error', () => resolve({ path, status: 'ERR', html: '' }));
  });
}
(async () => {
  for (const p of routes) {
    const { status, html } = await get(p);
    const emptySections = (html.match(/<section[^>]*>\s*<\/section>/g) || []).length;
    const undefinedTxt = (html.match(/>undefined<|>NaN<|>null</g) || []).length;
    const containerEmpty = (html.match(/<div class="container">\s*<\/div>/g) || []).length;
    const h2count = (html.match(/<h2/g) || []).length;
    console.log(`${status} ${p} len=${html.length} h2=${h2count} emptySection=${emptySections} containerVazio=${containerEmpty} undefind=${undefinedTxt}`);
  }
})();
