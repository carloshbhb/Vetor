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

function internalEvent(path: string): string | null {
  if (path.startsWith('/melhores/')) return 'buying_guide_click';
  if (path.startsWith('/reviews/')) return 'review_click';
  if (path.startsWith('/comparativos/')) return 'comparative_click';
  if (path.startsWith('/guias/')) return 'guide_click';
  if (path.startsWith('/ofertas/')) return 'offers_click';
  if (path.startsWith('/autor/') || path.startsWith('/author/')) return 'author_click';
  return null;
}

// Delegação global: mede afiliados, navegação comercial e profundidade de leitura.
// Sem gtag, é no-op. Sem JS, os links continuam navegando normalmente.
export default function AffiliateTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.('a') as HTMLAnchorElement | null;
      if (!a) return;

      const sponsored = a.matches('[rel~="sponsored"]');
      const href = a.href || '';
      const linkText = (a.textContent || '').trim().slice(0, 100);

      if (sponsored) {
        const affPos = a.dataset.affPos || 'inline';
        let destination = href;
        try {
          const target = new URL(href, location.origin);
          if (target.origin === location.origin && target.pathname.startsWith('/go/')) {
            destination = target.pathname;
          }
        } catch {
          // Mantém o href original se a URL não puder ser analisada.
        }

        track('affiliate_click', {
          link_url: destination,
          link_text: linkText,
          position: affPos,
          cta_type: 'affiliate',
          cta_variant: a.dataset.affVariant || affPos,
          page_path: location.pathname,
        });
        return;
      }

      try {
        const target = new URL(href, location.origin);
        if (target.origin !== location.origin) return;
        const eventName = internalEvent(target.pathname);
        if (eventName) {
          track(eventName, {
            link_url: target.pathname,
            link_text: linkText,
            page_path: location.pathname,
          });
        }
      } catch {
        // Links inválidos não devem interromper a navegação.
      }
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
  }, [pathname]);

  return null;
}
