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

      {/* Preload do logo (LCP crítico) */}
      <link rel="preload" href="/logo.png" as="image" type="image/png" />

      {/* Preload da fonte crítica */}
      <link
        rel="preload"
        href="https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
    </>
  );
}
