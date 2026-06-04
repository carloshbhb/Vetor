import { NextResponse } from 'next/server';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  url: string;
  userAgent: string;
  timestamp: string;
}

// In-memory store for metrics (in production, use a database)
const metricsStore: VitalMetric[] = [];
const MAX_METRICS = 5000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const metric: VitalMetric = {
      name: body.name,
      value: body.value,
      rating: body.rating,
      delta: body.delta,
      id: body.id,
      navigationType: body.navigationType,
      url: body.url,
      userAgent: body.userAgent,
      timestamp: body.timestamp,
    };

    // Add to store (with max limit)
    metricsStore.unshift(metric);
    if (metricsStore.length > MAX_METRICS) {
      metricsStore.pop();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', metric);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web Vitals logging failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  // Calculate aggregates
  const aggregates = calculateAggregates();
  
  return NextResponse.json({
    metrics: metricsStore.slice(0, 100),
    aggregates,
    total: metricsStore.length,
  });
}

function calculateAggregates() {
  const byName: Record<string, { values: number[]; ratings: Record<string, number> }> = {};

  for (const metric of metricsStore) {
    if (!byName[metric.name]) {
      byName[metric.name] = { values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } };
    }
    byName[metric.name].values.push(metric.value);
    byName[metric.name].ratings[metric.rating]++;
  }

  const aggregates: Record<string, { p50: number; p75: number; p95: number; rating: string }> = {};

  for (const [name, data] of Object.entries(byName)) {
    const sorted = data.values.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];

    const total = data.ratings.good + data.ratings['needs-improvement'] + data.ratings.poor;
    const goodPercentage = data.ratings.good / total;
    
    let rating = 'good';
    if (goodPercentage < 0.5) rating = 'poor';
    else if (goodPercentage < 0.75) rating = 'needs-improvement';

    aggregates[name] = { p50, p75, p95, rating };
  }

  return aggregates;
}