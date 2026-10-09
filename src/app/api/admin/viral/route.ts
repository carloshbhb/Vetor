import { NextRequest, NextResponse } from 'next/server';
import { getAllViralArticles, createViralArticle, deleteViralArticle } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/admin-auth';
import { buildComparativeIndexNowTargets, pingNewContent } from '@/lib/indexnow';
import { revalidateComparativeSurfaces } from '@/lib/revalidate-content';

export async function GET(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;
  try {
    const articles = await getAllViralArticles();
    return NextResponse.json(articles, { status: 200 });
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

    const required = ['slug', 'title', 'description', 'category', 'content', 'hero', 'products'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const result = await createViralArticle({
      slug: body.slug,
      title: body.title,
      description: body.description,
      category: body.category,
      content: body.content,
      hero: body.hero,
      products: body.products,
      seo_title: body.seo_title || body.title,
      seo_description: body.seo_description || body.description,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (result.data?.slug) {
      revalidateComparativeSurfaces([result.data.slug]);
      await pingNewContent(
        buildComparativeIndexNowTargets(result.data.slug),
        "admin-comparative-publish"
      );
    }

    return NextResponse.json(result.data, { status: 201 });
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

    const result = await deleteViralArticle(slug);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Comparative not found' ? 404 : 500 }
      );
    }

    if (result.deletedSlug) {
      revalidateComparativeSurfaces([result.deletedSlug]);
      await pingNewContent(
        buildComparativeIndexNowTargets(result.deletedSlug),
        'admin-comparative-delete'
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
