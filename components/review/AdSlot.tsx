'use client';

import { useEffect, useRef } from 'react';

export default function AdSlot({
  slot = 'auto',
  format = 'auto',
  className = '',
}: {
  slot?: string;
  format?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const client = process.env.NEXT_PUBLIC_AD_CLIENT;
  const adSlot  = process.env.NEXT_PUBLIC_AD_SLOT || slot;

  useEffect(() => {
    if (!client || !ref.current) return;
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [client]);

  if (!client) return null;

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
