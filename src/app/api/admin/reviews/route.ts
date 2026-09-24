import { NextRequest, NextResponse } from 'next/server';
import {
  getAllReviewsAdmin,
  createReview,
  deleteReview,
  updateReviewStatus,
} from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { markProductLinksForReview } from '@/lib/product-links';
import { buildContentUrl, pingNewContent } from '@/lib/indexnow';

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

    if (status === 'published') {
      await markProductLinksForReview(slug);
      await pingNewContent([buildContentUrl(`/reviews/${slug}`)]);
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
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
