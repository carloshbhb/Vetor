(async () => {
  const urls = [
    'https://www.mi.com/prod/xiaomi-pad-6s-pro',
    'https://www.mi.com/global/product/xiaomi-pad-6s-pro-124',
    'https://www.mi.com/sg/product/xiaomi-pad-6s-pro-124/',
  ];
  for (const url of urls) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:png|jpg|webp)/gi)].map((m) => m[0]).filter((u) => /pad|f1|f2|hero|banner/i.test(u));
    console.log(res.status, url.slice(0, 55));
    console.log('  og:', og ? og[1].slice(0, 90) : 'NENHUMA');
    console.log('  imgs:', [...new Set(imgs)].slice(0, 3));
  }
})();
