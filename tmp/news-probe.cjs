(async () => {
  const url = 'https://news.samsung.com/br/samsung-lanca-novo-galaxy-book4-no-brasil';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  console.log('og:', og ? og[1] : 'NENHUMA');
  const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:png|jpg|webp)/gi)].map((m) => m[0]);
  for (const u of [...new Set(imgs)].slice(0, 10)) console.log(u.slice(0, 100));
})();
