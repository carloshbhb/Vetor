import { NextResponse } from 'next/server';
import { getAllReviews, createReview, getReviewById } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import type { ReviewData } from '@/lib/types';

export async function GET() {
  const reviews = await getAllReviews();
  return NextResponse.json(reviews);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Omit<ReviewData, 'id' | 'createdAt' | 'updatedAt'>;
    const id = await createReview(body);

    // Sync to GitHub to trigger Vercel deployment/SSG rebuild
    if (process.env.GITHUB_TOKEN) {
      const fullReview = await getReviewById(id);
      if (fullReview) {
        await commitNewReviewToGitHub(fullReview);
      }
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
