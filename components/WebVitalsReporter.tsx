'use client';

import { useEffect } from 'react';

type MetricName = 'FCP' | 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'INP';

interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Get rating based on thresholds
function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<MetricName, [number, number]> = {
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
    INP: [200, 500],
  };

  const [good, poor] = thresholds[name] || [0, 0];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

// Send metric to API
async function sendMetric(metric: WebVitalMetric) {
  try {
    await fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metric,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Silently fail
  }
}

// Report Web Vitals
export function reportWebVitals() {
  if (typeof window === 'undefined') return;

  // @ts-ignore
  const { webVitals } = window;
  if (!webVitals) return;

  webVitals.on('FCP', handleMetric);
  webVitals.on('LCP', handleMetric);
  webVitals.on('FID', handleMetric);
  webVitals.on('CLS', handleMetric);
  webVitals.on('TTFB', handleMetric);
  webVitals.on('INP', handleMetric);
}

function handleMetric(metric: WebVitalMetric) {
  metric.rating = getRating(metric.name, metric.value);
  sendMetric(metric);

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric.rating);
  }
}

export default function WebVitalsReporter() {
  useEffect(() => {
    reportWebVitals();
  }, []);

  return null;
}