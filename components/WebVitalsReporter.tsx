'use client';

import { useEffect } from 'react';
import { onLCP, onCLS, onFCP, onTTFB, onINP, type Metric } from 'web-vitals';

type MetricName = 'FCP' | 'LCP' | 'CLS' | 'TTFB' | 'INP';

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<MetricName, [number, number]> = {
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    CLS: [0.1, 0.25],
    TTFB: [800, 1800],
    INP: [200, 500],
  };
  const [good, poor] = thresholds[name] || [0, 0];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

async function sendMetric(metric: Metric) {
  try {
    await fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: getRating(metric.name as MetricName, metric.value),
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Silently fail — telemetry should never break the page
  }
}

function handleMetric(metric: Metric) {
  sendMetric(metric);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
  }
}

export default function WebVitalsReporter() {
  useEffect(() => {
    onFCP(handleMetric);
    onLCP(handleMetric);
    onCLS(handleMetric);
    onTTFB(handleMetric);
    onINP(handleMetric);
  }, []);

  return null;
}
