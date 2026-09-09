// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Performance Optimizations (Core Web Vitals)
// ─────────────────────────────────────────────────────────────────────────────

export function PerformanceHead() {
  return (
    <>
      {/* Preconnect para domínios externos */}
      <link rel="preconnect" href="https://http2.mlstatic.com" />
      <link rel="preconnect" href="https://images.mlstatic.com" />
      <link rel="dns-prefetch" href="https://http2.mlstatic.com" />

      {/* RSS feed para Google Discover Follow */}
      <link
        rel="alternate"
        type="application/rss+xml"
        title="Vetor Blog - Reviews"
        href="https://www.vetor.blog/rss.xml"
      />
    </>
  );
}
