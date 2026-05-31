import { NextResponse } from 'next/server';
import { getReviewById, updateReview, deleteReview } from '@/lib/db';
import { commitUpdateReviewToGitHub, commitDeleteReviewFromGitHub } from '@/lib/github';
import { submitUrl } from '@/lib/indexnow';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(review);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const ok = await updateReview(params.id, body);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Sync to GitHub
    if (process.env.GITHUB_TOKEN) {
      const fullReview = await getReviewById(params.id);
      if (fullReview) {
        await commitUpdateReviewToGitHub(params.id, fullReview);
        if (fullReview.status === 'published') {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
          await submitUrl(`${siteUrl}/review/${fullReview.slug}`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // Sync to GitHub first
  if (process.env.GITHUB_TOKEN) {
    await commitDeleteReviewFromGitHub(params.id);
  }

  const ok = await deleteReview(params.id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  return NextResponse.json({ success: true });
}
