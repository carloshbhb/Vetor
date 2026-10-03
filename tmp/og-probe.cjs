(async () => {
  const targets = [
    { slug: 'apple-watch-series-9', url: 'https://www.apple.com/br/apple-watch-series-9/' },
    { slug: 'xiaomi-pad-6s-pro-review', url: 'https://www.mi.com/br/pad-6s-pro/' },
    { slug: 'samsung-galaxy-book4-np750xgj-kg4br-completo', url: 'https://www.samsung.com/br/computing/notebooks/galaxy-book4-15/' },
  ];
  for (const t of targets) {
    try {
      const res = await fetch(t.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
      console.log(t.slug, res.status, '| og:image:', og ? og[1].slice(0, 80) : 'NENHUMA');
    } catch (e) {
      console.log(t.slug, 'ERRO', e.message);
    }
  }
})();
