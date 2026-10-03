(async () => {
  const url = 'https://www.samsung.com/br/computers/samsung-book/galaxy-book4-15-6-inch-i5-8gb-256gb-np750xgj-kg4br/';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:png|jpg|webp)/gi)].map((m) => m[0]);
  const uniq = [...new Set(imgs)].filter((u) => /book4|np750|laptop|notebook/i.test(u));
  console.log('matches:', uniq.slice(0, 10));
  // também resource paths relativos
  const rel = [...html.matchAll(/(\/[^"\s]*(?:book4|np750)[^"\s]*\.(?:png|jpg|webp))/gi)].map((m) => m[1]);
  console.log('relative:', [...new Set(rel)].slice(0, 10));
})();
