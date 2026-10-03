(async () => {
  const q = encodeURIComponent('Apple Watch Series 9 GPS 45mm');
  const res = await fetch(`https://www.mercadolivre.com.br/jm/search?as_word=${q}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
  });
  console.log('status:', res.status);
  const html = await res.text();
  const thumbs = [...html.matchAll(/https:\/\/http2\.mlstatic\.com\/[^"']+/g)].map((m) => m[0]);
  console.log('mlstatic matches:', [...new Set(thumbs)].slice(0, 5));
  const dataIds = [...html.matchAll(/MLA-\d+/g)].map((m) => m[0]);
  console.log('ids:', [...new Set(dataIds)].slice(0, 5));
})();
