import { NextResponse } from 'next/server';
import { getAllReviews, createReview } from '@/lib/db';
import type { ReviewData } from '@/lib/types';

export async function GET() {
  const reviews = getAllReviews();
  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Omit<ReviewData, 'id' | 'createdAt' | 'updatedAt'>;
    const id = createReview(body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
