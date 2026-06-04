'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

export default function Analytics() {
  const pathname = usePathname();

  // Track page views on route change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // GA4 page view
    if (GA_ID && window.gtag) {
      window.gtag('config', GA_ID, {
        page_path: pathname,
        page_title: document.title,
      });
    }

    // Clarity custom event
    if (window.clarity) {
      window.clarity('set', 'page', pathname);
      window.clarity('set', 'pageTitle', document.title);
    }
  }, [pathname]);

  // Track affiliate clicks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const affiliateLink = target.closest('a[href*="mercadolivre"], a[href*="amzn"], a[href*="affiliate"]');
      
      if (affiliateLink) {
        const url = affiliateLink.getAttribute('href') || '';
        const product = affiliateLink.getAttribute('data-product') || 'unknown';
        
        // GA4 event
        if (window.gtag) {
          window.gtag('event', 'affiliate_click', {
            affiliate_url: url,
            product_name: product,
            page_path: pathname,
          });
        }

        // Clarity event
        if (window.clarity) {
          window.clarity('event', 'affiliate_click');
          window.clarity('set', 'product', product);
        }

        // Facebook Pixel
        if (window.fbq) {
          window.fbq('track', 'InitiateCheckout', {
            content_name: product,
            content_category: 'affiliate',
          });
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  return (
    <>
      {/* Google Analytics 4 */}
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
                page_title: document.title,
                send_page_view: true,
              });
            `}
          </Script>
        </>
      )}

      {/* Microsoft Clarity */}
      {CLARITY_ID && (
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      )}

      {/* Facebook Pixel */}
      {FB_PIXEL_ID && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${FB_PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  );
}

// Custom hook for tracking events
export function useTrackEvent() {
  const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;

    // GA4 event
    if (window.gtag) {
      window.gtag('event', eventName, params);
    }

    // Clarity event
    if (window.clarity) {
      window.clarity('event', eventName);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          window.clarity('set', key, String(value));
        });
      }
    }

    // Facebook Pixel
    if (window.fbq) {
      window.fbq('trackCustom', eventName, params);
    }
  };

  const trackPageView = (pagePath: string, pageTitle: string) => {
    if (typeof window === 'undefined') return;

    if (window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
        page_path: pagePath,
        page_title: pageTitle,
      });
    }

    if (window.clarity) {
      window.clarity('set', 'page', pagePath);
      window.clarity('set', 'pageTitle', pageTitle);
    }
  };

  const trackConversion = (conversionType: string, value?: number) => {
    if (typeof window === 'undefined') return;

    // GA4 conversion
    if (window.gtag) {
      window.gtag('event', conversionType, {
        value: value,
        currency: 'BRL',
      });
    }

    // Facebook Pixel conversion
    if (window.fbq) {
      const pixelEvents: Record<string, string> = {
        purchase: 'Purchase',
        lead: 'Lead',
        signup: 'CompleteRegistration',
        addToCart: 'AddToCart',
      };
      const fbEvent = pixelEvents[conversionType] || 'CustomEvent';
      window.fbq('track', fbEvent, { value: value, currency: 'BRL' });
    }
  };

  return { trackEvent, trackPageView, trackConversion };
}

// Declare global types
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}