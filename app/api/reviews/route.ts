import { NextResponse } from 'next/server';
import { getAllReviews, createReview, getReviewById } from '@/lib/db';
import { commitNewReviewToGitHub } from '@/lib/github';
import { submitUrl } from '@/lib/indexnow';
import { indexNewReview } from '@/lib/google-indexing';
import type { ReviewData } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
        if (fullReview.status === 'published') {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
          const reviewUrl = `${siteUrl}/review/${fullReview.slug}`;
          // IndexNow (Bing, Yandex, etc)
          await submitUrl(reviewUrl);
          // Google Indexing API
          await indexNewReview(fullReview.slug);
        }
      }
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
