import { NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reviews = await getPublishedReviews();
    return NextResponse.json({ count: reviews.length, reviews: reviews.slice(0, 2) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
