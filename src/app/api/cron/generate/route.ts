import { NextRequest, NextResponse } from 'next/server';
import { createReview, createViralArticle } from '@/lib/supabase';
import { generateReview } from '@/lib/generate';
import { generateViralArticle } from '@/lib/generate-viral';
import { resolveProductImage } from '@/lib/image-resolver';
import { REVIEW_PRODUCTS, VIRAL_TOPICS } from '@/lib/seed-data';

interface CronResult {
  review?: { slug: string; status: string; error?: string };
  viralArticle?: { slug: string; status: string; error?: string };
  timestamp: string;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result: CronResult = { timestamp: new Date().toISOString() };

    const product = pickRandom(REVIEW_PRODUCTS);
    console.log(`[CRON] Generating review: ${product.title}`);

    try {
      const review = await generateReview({
        ...product,
        product_url: product.product_url,
        marketplace: 'mercadolivre',
      });
      const dbResult = await createReview({
        slug: review.slug,
        product: review.title,
        category: review.category,
        price_new: review.price,
        image_url: review.image,
        content: review.content,
        meta_title: review.seo_title,
        meta_description: review.seo_description,
        pros: review.pros,
        cons: review.cons,
        hero_overall_score: review.hero_overall_score,
        verdict_score: review.verdict_score,
        verdict_label: review.verdict_label,
        verdict_text: review.verdict_text,
        verdict_note: review.verdict_note,
        hero_bars: review.hero_bars,
        specs: review.specs,
        sections: review.sections,
        compare_table: review.compare_table,
        hero_lead: review.hero_lead,
        hero_headline_line1: review.hero_headline_line1,
        hero_headline_line2: review.hero_headline_line2,
        hero_headline_em: review.hero_headline_em,
        faq: review.faq,
        marketplace: 'mercadolivre',
        affiliate_url: product.product_url || review.image,
      });

      if (dbResult.error) {
        result.review = { slug: review.slug, status: 'failed', error: dbResult.error };
      } else {
        result.review = { slug: review.slug, status: 'success' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.review = { slug: product.title, status: 'failed', error: message };
    }

    const topic = pickRandom(VIRAL_TOPICS);
    console.log(`[CRON] Generating viral article: ${topic.title}`);

    try {
      const resolvedProducts = await Promise.all(
        topic.comparisonProducts.map(async (p) => ({
          ...p,
          imageUrl: await resolveProductImage(p.imageUrl),
        }))
      );

      const article = await generateViralArticle({
        title: topic.title,
        category: topic.category,
        comparisonProducts: resolvedProducts,
      });

      const dbResult = await createViralArticle({
        slug: article.slug,
        title: article.title,
        description: article.description,
        category: article.category,
        content: article.content,
        hero: article.hero,
        products: resolvedProducts,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
      });

      if (dbResult.error) {
        result.viralArticle = { slug: article.slug, status: 'failed', error: dbResult.error };
      } else {
        result.viralArticle = { slug: article.slug, status: 'success' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.viralArticle = { slug: topic.title, status: 'failed', error: message };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
