import { NextRequest, NextResponse } from 'next/server';
import { createViralArticle } from '@/lib/supabase';
import { generateViralArticle } from '@/lib/generate-viral';
import { resolveProductImage } from '@/lib/image-resolver';
import { REVIEW_PRODUCTS, VIRAL_TOPICS } from '@/lib/seed-data';
import { buildContentUrl, pingNewContent } from '@/lib/indexnow';
import {
  getNextReviewProductLink,
  markProductLinkReviewed,
} from '@/lib/product-links';
import {
  productLinkToPipelineInput,
  runReviewPipeline,
} from '@/lib/content-pipeline';

type CronReviewStatus = 'success' | 'failed' | 'skipped';

interface CronResult {
  review?: { slug: string; status: CronReviewStatus; error?: string; issues?: string[] };
  viralArticle?: { slug: string; status: CronReviewStatus; error?: string };
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

    const backlogLink = await getNextReviewProductLink();
    const product = backlogLink
      ? productLinkToPipelineInput(backlogLink)
      : (() => {
          const seed = pickRandom(REVIEW_PRODUCTS);
          return {
            title: seed.title,
            category: seed.category,
            price: seed.price,
            image: seed.image,
            product_url: seed.product_url,
            marketplace: 'mercadolivre' as const,
          };
        })();

    console.log(`[CRON] Generating review: ${product.title} (source: ${backlogLink ? 'backlog' : 'seed'})`);

    const outcome = await runReviewPipeline(product, 'cron');

    if (outcome.status === 'created') {
      if (backlogLink) {
        await markProductLinkReviewed(backlogLink.id, outcome.slug);
      }
      result.review = { slug: outcome.slug, status: 'success' };
    } else if (outcome.status === 'validation_failed') {
      result.review = {
        slug: outcome.slug ?? product.title,
        status: 'skipped',
        error: 'quality validation failed',
        issues: outcome.issues,
      };
    } else if (outcome.status === 'db_error') {
      result.review = {
        slug: outcome.slug ?? product.title,
        status: 'failed',
        error: outcome.error,
      };
    } else {
      result.review = {
        slug: product.title,
        status: 'failed',
        error: outcome.error,
      };
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
        await pingNewContent([buildContentUrl(`/comparativos/${article.slug}`)]);
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
