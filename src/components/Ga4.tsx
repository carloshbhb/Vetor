'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getCookieConsent } from '@/components/CookieBanner';

// GA4 via gtag. Só em produção, com NEXT_PUBLIC_GA_ID e consentimento 'all' (LGPD).
export default function Ga4() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => setAllowed(getCookieConsent() === 'all');
    check();
    window.addEventListener('cookie-consent-changed', check);
    return () => window.removeEventListener('cookie-consent-changed', check);
  }, []);

  if (process.env.NODE_ENV !== 'production' || !id || !allowed) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
