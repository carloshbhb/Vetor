import { NextResponse } from 'next/server';
import { getWebVitals, createVitalMetric } from '@/lib/db-vitals';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await createVitalMetric({
      name: body.name,
      value: body.value,
      rating: body.rating,
      delta: body.delta,
      id: body.id,
      navigationType: body.navigationType,
      url: body.url,
      userAgent: body.userAgent,
      timestamp: body.timestamp,
    });

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Web Vitals]', body);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Web Vitals logging failed:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET() {
  const { metrics, aggregates, total } = await getWebVitals();
  return NextResponse.json({ metrics, aggregates, total });
}