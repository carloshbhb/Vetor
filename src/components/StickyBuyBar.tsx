'use client';

import { useEffect } from 'react';

type StickyBuyBarProps = {
  affiliateSlug: string;
  label?: string;
};

// Barra de compra no mobile: aparece depois do veredito e some perto do rodapé.
// Sem JS, a barra nunca aparece (progressive enhancement); o link existe no conteúdo.
export default function StickyBuyBar({ affiliateSlug, label = 'Ver preço atualizado' }: StickyBuyBarProps) {
  useEffect(() => {
    const bar = document.querySelector('.mobile-cta');
    const verdict = document.getElementById('veredito');
    const footer = document.querySelector('footer');
    if (!bar || !('IntersectionObserver' in window)) return;

    let seenVerdict = true;
    let nearFooter = false;
    const update = () => bar.classList.toggle('show', !seenVerdict && !nearFooter);

    const verdictObserver = new IntersectionObserver((entries) => {
      seenVerdict = entries[0].isIntersecting;
      update();
    });
    if (verdict) verdictObserver.observe(verdict);

    let footerObserver: IntersectionObserver | null = null;
    if (footer) {
      footerObserver = new IntersectionObserver((entries) => {
        nearFooter = entries[0].isIntersecting;
        update();
      });
      footerObserver.observe(footer);
    }
    return () => {
      verdictObserver.disconnect();
      footerObserver?.disconnect();
    };
  }, []);

  return (
    <div className="mobile-cta" aria-label="Ação de compra">
      <a
        className="cta"
        href={`/go/${affiliateSlug}/`}
        data-aff-pos="sticky-mobile"
        target="_blank"
        rel="sponsored nofollow noopener"
      >
        {label}
      </a>
    </div>
  );
}
