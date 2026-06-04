'use client';

import { useEffect, useRef, useState } from 'react';

export default function AdSlot({
  slot = 'auto',
  format = 'auto',
  className = '',
  lazy = true,
}: {
  slot?: string;
  format?: string;
  className?: string;
  lazy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const client = process.env.NEXT_PUBLIC_AD_CLIENT;
  const adSlot  = process.env.NEXT_PUBLIC_AD_SLOT || slot;

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (!lazy || !ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before visible
        threshold: 0,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [lazy, hasLoaded]);

  // Load AdSense when visible
  useEffect(() => {
    if (!isVisible || !client || !ref.current) return;
    
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [isVisible, client]);

  if (!client) return null;

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      {isVisible ? (
        /* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={client}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : (
        /* Placeholder while loading */
        <div 
          className="bg-gray-100 animate-pulse rounded-lg"
          style={{ minHeight: format === 'rectangle' ? '250px' : '90px' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
