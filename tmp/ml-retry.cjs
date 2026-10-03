(async () => {
  for (const useUA of [false, true]) {
    const headers = useUA
      ? { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }
      : { Accept: 'application/json' };
    const res = await fetch('https://api.mercadolibre.com/sites/MLB/search?q=apple%20watch%20series%209&limit=2', { headers });
    console.log(useUA ? 'com UA:' : 'sem UA:', res.status);
    if (res.ok) break;
  }
})();
