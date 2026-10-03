(async () => {
  const urls = [
    'https://www.samsung.com/br/computers/samsung-book/galaxy-book4-15-6-inch-i5-8gb-256gb-np750xgj-kg4br/',
    'https://www.samsung.com/br/xpiu/galaxy-pad-6s-pro/',
    'https://www.samsung.com/br/tablets/galaxy-tab-s9-fe/',
  ];
  for (const url of urls) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const og = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
    console.log(res.status, url.slice(0, 60), '| og:', og ? og[1].slice(0, 90) : 'NENHUMA');
  }
})();
