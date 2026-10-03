const https = require('https');
const routes = [
  '/', '/reviews', '/comparativos', '/guias', '/ofertas', '/tags', '/author',
  '/sobre', '/metodologia', '/privacidade', '/contato', '/termos',
  '/politica-editorial', '/como-avaliamos', '/afiliados',
  '/reviews/categoria',
];
function get(path) {
  return new Promise((resolve) => {
    https.get('https://www.vetor.blog' + path, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => resolve({ path, status: r.statusCode, html: d }));
    }).on('error', (e) => resolve({ path, status: 'ERR', html: e.message }));
  });
}
(async () => {
  for (const p of routes) {
    const { status, html } = await get(p);
    const emptySections = (html.match(/<section[^>]*>\s*<\/section>/g) || []).length;
    const emptyDivs = (html.match(/<div[^>]*>\s*<\/div>/g) || []).length;
    const emptyGrids = (html.match(/class="[^"]*(grid|cards|list)[^"]*"[^>]*>\s*<\/div>/g) || []).length;
    const undefinedTxt = (html.match(/>undefined<|>NaN<|>null</g) || []).length;
    const containerEmpty = (html.match(/<div class="container">\s*<\/div>/g) || []).length;
    console.log(`${status} ${p} len=${html.length} emptySection=${emptySections} emptyDiv=${emptyDivs} containerVazio=${containerEmpty} undef/NaN/null=${undefinedTxt}`);
  }
})();
