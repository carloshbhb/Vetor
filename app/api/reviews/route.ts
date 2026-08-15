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

    const fullReview = await getReviewById(id);

    // Index published reviews immediately (independent of GitHub sync)
    if (fullReview && fullReview.status === 'published') {
      const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
      const siteUrl = _raw.startsWith('http') ? _raw : `https://${_raw}`;
      const reviewUrl = `${siteUrl}/review/${fullReview.slug}`;
      submitUrl(reviewUrl).catch(e => console.warn('[API] IndexNow failed (non-fatal):', e.message));
      indexNewReview(fullReview.slug).catch(e => console.warn('[API] Google Indexing failed (non-fatal):', e.message));
    }

    // Sync to GitHub (separate concern)
    if (process.env.GITHUB_TOKEN && fullReview) {
      try {
        await commitNewReviewToGitHub(fullReview);
      } catch (syncErr: any) {
        console.error('[API] GitHub sync failed (non-fatal):', syncErr.message);
      }
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
