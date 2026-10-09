import { NextRequest, NextResponse } from 'next/server';
import { revalidateReviewSurfaces } from '@/lib/revalidate-content';
import {
  getAllReviewsAdmin,
  createReview,
  deleteReview,
  updateReviewStatus,
} from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { markProductLinksForReview } from '@/lib/product-links';
import { buildReviewIndexNowTargets, pingNewContent } from '@/lib/indexnow';

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  try {
    const reviews = await getAllReviewsAdmin();
    return NextResponse.json(reviews, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();

    const required = ['slug', 'product', 'category', 'price_new', 'image_url'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const result = await createReview({
      slug: body.slug,
      product: body.product,
      category: body.category,
      price_new: body.price_new,
      image_url: body.image_url,
      meta_title: body.meta_title || body.product,
      meta_description: body.meta_description || '',
      hero_overall_score: body.hero_overall_score,
      verdict_score: body.verdict_score,
      pros: body.pros,
      cons: body.cons,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const reviewSlug = typeof result.data?.slug === 'string' ? result.data.slug : body.slug;
    if (reviewSlug) {
      revalidateReviewSurfaces([reviewSlug], [result.data?.category || body.category || '']);
    }

    // POST can create a draft or update an already-published review. Notify
    // search engines only when the saved record is publicly published.
    if (result.data?.status === 'published' && reviewSlug) {
      await pingNewContent(
        buildReviewIndexNowTargets(reviewSlug, result.data.category),
        'admin-review-upsert'
      );
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const status = body.status;

    if (!slug || body.id) {
      return NextResponse.json(
        { error: 'Missing or invalid slug field (id is not accepted; use slug)' },
        { status: 400 }
      );
    }

    if (status !== 'draft' && status !== 'published') {
      return NextResponse.json(
        { error: 'status must be "draft" or "published"' },
        { status: 400 }
      );
    }

    const result = await updateReviewStatus({ slug }, status);
    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Review not found' },
        { status: result.error === 'Review not found' ? 404 : 500 }
      );
    }

    revalidateReviewSurfaces([slug], [result.data.category || '']);

    if (status === 'published') {
      await markProductLinksForReview(slug);
      await pingNewContent(
        buildReviewIndexNowTargets(slug, result.data.category ?? ''),
        'admin-review-publish'
      );
    }

    return NextResponse.json({ success: true, slug, status }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    const result = await deleteReview(slug);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Review not found' ? 404 : 500 }
      );
    }

    const deleted = result.deleted;
    revalidateReviewSurfaces([slug], deleted?.category ? [deleted.category] : []);

    if (deleted?.status === 'published') {
      await pingNewContent(
        buildReviewIndexNowTargets(slug, deleted.category ?? ''),
        'admin-review-delete'
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
