(async () => {
  const res = await fetch('https://www.mi.com/br/pad-6s-pro/', { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const imgs = [...html.matchAll(/https?:\/\/[^"'\s]+\.(?:png|jpg|jpeg|webp)/gi)].map((m) => m[0]);
  const uniq = [...new Set(imgs)].filter((u) => /pad|product|hero|f[12]/i.test(u));
  for (const u of uniq.slice(0, 15)) console.log(u.slice(0, 110));
})();
