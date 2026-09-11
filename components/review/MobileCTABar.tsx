'use client';

import { useEffect, useState } from 'react';

export default function MobileCTABar({ 
  affiliateUrl, 
  product 
}: { 
  affiliateUrl?: string | null;
  product: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past the hero section
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!affiliateUrl) return null;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-border shadow-lg transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted truncate">{product}</p>
          <p className="text-sm font-bold text-blue">Ver melhor preço</p>
        </div>
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex-shrink-0 bg-blue text-white font-syne font-bold px-6 py-2.5 rounded-full text-sm hover:bg-blue-dark transition-colors"
        >
          Comprar →
        </a>
      </div>
    </div>
  );
}
