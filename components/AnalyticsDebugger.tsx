'use client';

import { useEffect, useState } from 'react';

interface AnalyticsStatus {
  clarity: boolean;
  ga4: boolean;
  sentry: boolean;
  fbPixel: boolean;
}

export default function AnalyticsDebugger() {
  const [status, setStatus] = useState<AnalyticsStatus>({
    clarity: false,
    ga4: false,
    sentry: false,
    fbPixel: false,
  });
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    // Check if analytics scripts are loaded
    const checkAnalytics = () => {
      setStatus({
        clarity: typeof window.clarity === 'function',
        ga4: typeof window.gtag === 'function',
        sentry: typeof window.Sentry !== 'undefined',
        fbPixel: typeof window.fbq === 'function',
      });
    };

    // Check every second
    const interval = setInterval(checkAnalytics, 1000);
    checkAnalytics();

    return () => clearInterval(interval);
  }, []);

  const testEvent = (eventName: string) => {
    if (typeof window === 'undefined') return;

    // GA4
    if (window.gtag) {
      window.gtag('event', eventName, {
        event_category: 'debug',
        event_label: 'test',
      });
    }

    // Clarity
    if (window.clarity) {
      window.clarity('event', eventName);
    }

    // Facebook Pixel
    if (window.fbq) {
      window.fbq('trackCustom', eventName);
    }

    setEvents(prev => [...prev, `${new Date().toLocaleTimeString()} - ${eventName}`]);
  };

  const testAffiliateClick = () => {
    testEvent('affiliate_click');
    testEvent('affiliate_click');
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border border-border p-4 max-w-sm z-50">
      <h3 className="font-syne font-bold text-sm mb-3">Analytics Debugger</h3>
      
      <div className="space-y-2 text-xs mb-4">
        <div className="flex items-center justify-between">
          <span>Microsoft Clarity</span>
          <span className={status.clarity ? 'text-green-600' : 'text-red-600'}>
            {status.clarity ? '✓ Loaded' : '✗ Not loaded'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Google Analytics 4</span>
          <span className={status.ga4 ? 'text-green-600' : 'text-red-600'}>
            {status.ga4 ? '✓ Loaded' : '✗ Not loaded'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Sentry</span>
          <span className={status.sentry ? 'text-green-600' : 'text-red-600'}>
            {status.sentry ? '✓ Loaded' : '✗ Not loaded'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Facebook Pixel</span>
          <span className={status.fbPixel ? 'text-green-600' : 'text-red-600'}>
            {status.fbPixel ? '✓ Loaded' : '✗ Not loaded'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => testEvent('test_event')}
          className="px-3 py-1 bg-blue text-white rounded text-xs hover:bg-blue/90"
        >
          Test Event
        </button>
        <button
          onClick={testAffiliateClick}
          className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
        >
          Test Affiliate
        </button>
      </div>

      {events.length > 0 && (
        <div className="max-h-32 overflow-y-auto border-t border-border pt-2">
          <p className="text-xs text-text-muted mb-1">Eventos enviados:</p>
          {events.slice(-5).map((event, idx) => (
            <p key={idx} className="text-xs text-text-2">{event}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// Import types from lib/sentry.ts
import type {} from '@/lib/sentry';

// Re-export global types
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
  }
}