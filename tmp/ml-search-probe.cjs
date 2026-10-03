require('dotenv').config({ path: '.env.local' });
(async () => {
  const res = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent('Apple Watch Series 9 GPS 45mm')}&limit=3`);
  console.log('status:', res.status);
  const json = await res.json().catch(() => null);
  if (json) {
    console.log('results:', (json.results || []).length);
    for (const r of json.results || []) {
      console.log('-', r.title?.slice(0, 50), '| thumb:', r.thumbnail);
    }
  } else {
    console.log((await res.text()).slice(0, 200));
  }
})();
