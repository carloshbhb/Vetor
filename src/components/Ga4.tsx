'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getCookieConsent } from '@/components/CookieBanner';

// GA4 via gtag. Só em produção, com NEXT_PUBLIC_GA_ID e consentimento 'all' (LGPD).
export default function Ga4() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      const consent = getCookieConsent();
      setAllowed(consent === 'all');

      if (consent !== 'all') {
        // If consent is revoked after GA4 loaded, stop collection and clear its first-party cookies.
        const gtag = (window as Window & {
          gtag?: (...args: unknown[]) => void;
        }).gtag;
        gtag?.('consent', 'update', { analytics_storage: 'denied' });

        const cookieNames = document.cookie
          .split(';')
          .map((cookie) => cookie.trim().split('=')[0])
          .filter((name) => name === '_ga' || name.startsWith('_ga_'));
        for (const name of cookieNames) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.vetor.blog; SameSite=Lax`;
        }
      }
    };
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
