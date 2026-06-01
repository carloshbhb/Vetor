import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getReviewById, deleteReview } from '@/lib/db';
import { commitUpdateReviewToGitHub, commitDeleteReviewFromGitHub } from '@/lib/github';
import { submitUrl } from '@/lib/indexnow';
import { indexNewReview } from '@/lib/google-indexing';

export const dynamic = 'force-dynamic';

function getDirectClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const review = await getReviewById(params.id);
  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(review);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const id = params.id;

    // Direct Supabase update - bypass db.ts to ensure it works
    const client = getDirectClient();
    if (!client) {
      return NextResponse.json({ error: 'Supabase não configurado' }, { status: 500 });
    }

    // Build update data mapping camelCase → snake_case
    const u: any = {};
    if (body.slug !== undefined) u.slug = body.slug;
    if (body.status !== undefined) u.status = body.status;
    if (body.product !== undefined) u.product = body.product;
    if (body.category !== undefined) u.category = body.category;
    if (body.marketplace !== undefined) u.marketplace = body.marketplace;
    if (body.priceOld !== undefined) u.price_old = body.priceOld;
    if (body.priceNew !== undefined) u.price_new = body.priceNew;
    if (body.affiliateUrl !== undefined) u.affiliate_url = body.affiliateUrl;
    if (body.imageUrl !== undefined) u.image_url = body.imageUrl;
    if (body.adsEnabled !== undefined) u.ads_enabled = body.adsEnabled;
    if (body.meta) {
      if (body.meta.title !== undefined) u.meta_title = body.meta.title;
      if (body.meta.description !== undefined) u.meta_description = body.meta.description;
      if (body.meta.keywords !== undefined) u.meta_keywords = body.meta.keywords;
      if (body.meta.readingTime !== undefined) u.meta_reading_time = body.meta.readingTime;
      if (body.meta.canonical !== undefined) u.meta_canonical = body.meta.canonical;
      if (body.meta.ogImage !== undefined) u.meta_og_image = body.meta.ogImage;
    }
    if (body.hero) {
      if (body.hero.headlineLine1 !== undefined) u.hero_headline_line1 = body.hero.headlineLine1;
      if (body.hero.headlineLine2 !== undefined) u.hero_headline_line2 = body.hero.headlineLine2;
      if (body.hero.headlineEm !== undefined) u.hero_headline_em = body.hero.headlineEm;
      if (body.hero.lead !== undefined) u.hero_lead = body.hero.lead;
      if (body.hero.overallScore !== undefined) u.hero_overall_score = body.hero.overallScore;
      if (body.hero.bars !== undefined) u.hero_bars = body.hero.bars;
    }
    if (body.specs !== undefined) u.specs = body.specs;
    if (body.sections !== undefined) u.sections = body.sections;
    if (body.compareTable !== undefined) u.compare_table = body.compareTable;
    if (body.pros !== undefined) u.pros = body.pros;
    if (body.cons !== undefined) u.cons = body.cons;
    if (body.faq !== undefined) u.faq = body.faq;
    if (body.testimonials !== undefined) u.testimonials = body.testimonials;
    if (body.verdict) {
      if (body.verdict.score !== undefined) u.verdict_score = body.verdict.score;
      if (body.verdict.label !== undefined) u.verdict_label = body.verdict.label;
      if (body.verdict.text !== undefined) u.verdict_text = body.verdict.text;
      if (body.verdict.note !== undefined) u.verdict_note = body.verdict.note;
    }
    if (body.schemaRating) {
      if (body.schemaRating.ratingValue !== undefined) u.schema_rating_value = body.schemaRating.ratingValue;
      if (body.schemaRating.reviewCount !== undefined) u.schema_review_count = body.schemaRating.reviewCount;
    }

    const fieldCount = Object.keys(u).length;
    console.log(`[API-Direct] PUT ${id} — ${fieldCount} fields: ${Object.keys(u).join(', ')}`);

    // Read BEFORE
    const { data: before } = await client
      .from('reviews')
      .select('product, slug, updated_at')
      .eq('id', id)
      .single();

    const { data, error } = await client
      .from('reviews')
      .update(u)
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('[API-Direct] Supabase update error:', error);
      return NextResponse.json({ error: `Supabase: ${error.message}`, debug: { fieldCount, keys: Object.keys(u) } }, { status: 500 });
    }

    const matched = data?.length ?? 0;
    console.log(`[API-Direct] Supabase update matched ${matched} row(s)`);

    if (matched === 0) {
      return NextResponse.json({ error: `Review ${id} não encontrada no Supabase` }, { status: 404 });
    }

    // Read AFTER to verify persistence
    const { data: after } = await client
      .from('reviews')
      .select('product, slug, updated_at')
      .eq('id', id)
      .single();

    return NextResponse.json({
      success: true,
      matched,
      debug: {
        before,
        after,
        productChanged: before?.product !== after?.product,
        updated_atChanged: before?.updated_at !== after?.updated_at,
        updatePayload: u,
      },
    });
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
