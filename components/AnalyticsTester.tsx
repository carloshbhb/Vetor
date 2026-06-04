'use client';

import { useEffect } from 'react';
import type {} from '@/lib/glitchtip';

export default function AnalyticsTester() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    console.log('🔍 Analytics Tester loaded');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Test Clarity
    if (window.clarity) {
      console.log('✅ Microsoft Clarity: Loaded');
      window.clarity('set', 'test', 'true');
      window.clarity('event', 'test_event');
      console.log('   → Sent test event to Clarity');
    } else {
      console.log('❌ Microsoft Clarity: Not loaded');
    }

    // Test GA4
    if (window.gtag) {
      console.log('✅ Google Analytics 4: Loaded');
      window.gtag('event', 'test_event', {
        event_category: 'debug',
        event_label: 'analytics_test',
      });
      console.log('   → Sent test event to GA4');
    } else {
      console.log('❌ Google Analytics 4: Not loaded');
    }

    // Test GlitchTip
    if (window.Sentry) {
      console.log('✅ GlitchTip: Loaded');
    } else {
      console.log('❌ GlitchTip: Not loaded');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Check your dashboards:');
    console.log('   Clarity: https://clarity.microsoft.com');
    console.log('   GA4: https://analytics.google.com');
    console.log('   GlitchTip: https://app.glitchtip.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, []);

  return null;
}

// Re-export global types
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    clarity: (...args: unknown[]) => void;
  }
}