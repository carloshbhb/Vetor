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
    const id = params.id;

    // Use db.ts wrapper that seamlessly handles Supabase and local JSON fallback
    const success = await updateReview(id, body);
    if (!success) {
      return NextResponse.json({ error: `Review ${id} não encontrada` }, { status: 404 });
    }

    // Sync changes to GitHub if token is present (Vercel autobuild / persistence)
    if (process.env.GITHUB_TOKEN) {
      try {
        const fullReview = await getReviewById(id);
        if (fullReview) {
          await commitUpdateReviewToGitHub(id, fullReview);
          if (fullReview.status === 'published') {
            const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
            const siteUrl = _raw.startsWith('http') ? _raw : `https://${_raw}`;
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
