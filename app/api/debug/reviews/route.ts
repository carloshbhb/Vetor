import { NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';

export async function GET() {
  try {
    const reviews = await getPublishedReviews();
    return NextResponse.json({ count: reviews.length, reviews: reviews.slice(0, 2) }); // show first 2 for brevity
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}