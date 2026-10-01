'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GtagParams = Record<string, string | number>;

function track(name: string, params: GtagParams) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}

// Delegação global: cliques em afiliados + profundidade de leitura (GA4).
// Funciona com links adicionados depois; sem gtag, é no-op. Sem JS, os links
// continuam navegando (progressive enhancement).
export default function AffiliateTracker() {
  // Reseta scroll_depth a cada navegação SPA (o componente monta uma vez no layout).
  const pathname = usePathname();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.('a[rel~="sponsored"]') as HTMLAnchorElement | null;
      if (!a) return;
      track('affiliate_click', {
        link_url: a.href,
        link_text: (a.textContent || '').trim().slice(0, 100),
        position: a.dataset.affPos || 'inline',
        page_path: location.pathname,
      });
    };

    const marks = [25, 50, 75, 90];
    const sent = new Set<number>();
    const onScroll = () => {
      const h = document.documentElement;
      const pct = ((h.scrollTop + window.innerHeight) / h.scrollHeight) * 100;
      for (const m of marks) {
        if (pct >= m && !sent.has(m)) {
          sent.add(m);
          track('scroll_depth', { percent: m, page_path: location.pathname });
        }
      }
    };

    document.addEventListener('click', onClick);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
