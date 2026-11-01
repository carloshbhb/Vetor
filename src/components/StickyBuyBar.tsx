'use client';

import { useEffect } from 'react';
import { buildSiteTrackedAffiliateUrl } from '@/lib/affiliate-attribution';

type StickyBuyBarProps = {
  affiliateSlug: string;
  label?: string;
  price?: string;
  trackingPageSlug?: string;
};

export default function StickyBuyBar({ affiliateSlug, label, price, trackingPageSlug }: StickyBuyBarProps) {
  const ctaLabel = label || (price ? 'Ver oferta e preço' : 'Ver preço e disponibilidade');
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
    <div className="mobile-cta" role="complementary" aria-label="Ação de compra rápida">
      <div className="mobile-cta-info">
        <span>Compra rápida</span>
        {price && <strong>{price}</strong>}
      </div>
      <a
        className="cta cta--primary-buy"
        href={buildSiteTrackedAffiliateUrl(`/go/${affiliateSlug}/`, { pageSlug: trackingPageSlug || affiliateSlug, placement: 'sticky-mobile', contentId: `${trackingPageSlug || affiliateSlug}:sticky-mobile` })}
        data-aff-pos="sticky-mobile"
        target="_blank"
        rel="sponsored nofollow noopener"
        aria-label={ctaLabel}
      >
        {ctaLabel} →
      </a>
    </div>
  );
}
