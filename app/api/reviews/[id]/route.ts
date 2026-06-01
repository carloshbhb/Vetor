import { NextResponse } from 'next/server';
import { getReviewById, updateReview, deleteReview } from '@/lib/db';
import { commitUpdateReviewToGitHub, commitDeleteReviewFromGitHub } from '@/lib/github';
import { submitUrl } from '@/lib/indexnow';
import { indexNewReview } from '@/lib/google-indexing';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(review);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    console.log(`[API] PUT /api/reviews/${params.id} - fields: ${Object.keys(body).join(', ')}`);

    const ok = await updateReview(params.id, body);

    if (!ok) {
      console.error(`[API] PUT failed - review ${params.id} not found or no changes`);
      return NextResponse.json({ error: 'Review não encontrada' }, { status: 404 });
    }

    console.log(`[API] PUT success for ${params.id}`);

    if (process.env.GITHUB_TOKEN) {
      try {
        const fullReview = await getReviewById(params.id);
        if (fullReview) {
          await commitUpdateReviewToGitHub(params.id, fullReview);
          if (fullReview.status === 'published') {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
            const reviewUrl = `${siteUrl}/review/${fullReview.slug}`;
            await submitUrl(reviewUrl);
            await indexNewReview(fullReview.slug);
          }
        }
      } catch (syncErr: any) {
        console.error('[API] GitHub sync failed (non-fatal):', syncErr.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    if (process.env.GITHUB_TOKEN) {
      await commitDeleteReviewFromGitHub(params.id);
    }
    const ok = await deleteReview(params.id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
