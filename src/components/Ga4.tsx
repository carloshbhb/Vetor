'use client';

import Script from 'next/script';

// GA4 via gtag. Só em produção e só com NEXT_PUBLIC_GA_ID definido.
export default function Ga4() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (process.env.NODE_ENV !== 'production' || !id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
