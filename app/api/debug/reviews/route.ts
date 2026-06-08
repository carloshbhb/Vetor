import { NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    const reviews = await getPublishedReviews();
    return NextResponse.json({ count: reviews.length, reviews: reviews.slice(0, 2) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
