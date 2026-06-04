'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Microsoft Clarity (free heatmaps & session recordings)
    if (CLARITY_ID && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${CLARITY_ID}`;
      document.head.appendChild(script);
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // GA4 page view
    if (GA_ID && window.gtag) {
      window.gtag('config', GA_ID, {
        page_path: pathname,
      });
    }

    // Clarity custom event
    if (CLARITY_ID && window.clarity) {
      window.clarity('set', 'page', pathname);
    }
  }, [pathname, GA_ID, CLARITY_ID]);

  return null;
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
    }

    // Custom pixel tracking (e.g., Facebook Pixel)
    if (window.fbq) {
      window.fbq('trackCustom', eventName, params);
    }
  };

  return { trackEvent };
}

// Declare global types
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
  }
}