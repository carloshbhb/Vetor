(async () => {
  const res = await fetch('http://web.archive.org/cdx/search/cdx?url=samsung.com/br/computers/samsung-book/galaxy-book4*&output=json&filter=statuscode:200&filter=mimetype:text/html&limit=20&collapse=urlkey');
  const json = await res.json();
  for (const row of (json || []).slice(1)) console.log(row[2], row[1]);
})();
