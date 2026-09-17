import { NextRequest, NextResponse } from 'next/server';
import { getAllReviews, getAllViralArticles } from '@/lib/supabase';
import { generateVideoScript } from '@/lib/script-generator';
import { createClient } from '@supabase/supabase-js';

const SERVICE_SUPABASE = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

interface VideoJobResult {
  type: string;
  slug: string;
  status: string;
  videoId?: string;
  error?: string;
}

async function createVideoQueueEntry(data: {
  product_title: string;
  product_category: string;
  product_price: string;
  product_image_url: string;
  product_url: string;
  type: 'review' | 'comparison';
  slug: string;
  script_hook: string;
  script_text: string;
}): Promise<string | null> {
  const { data: result, error } = await SERVICE_SUPABASE
    .from('video_queue')
    .insert({
      product_url: data.product_url,
      product_title: data.product_title,
      product_category: data.product_category,
      product_price: data.product_price,
      product_image_url: data.product_image_url,
      affiliate_url: data.product_url,
      shortened_affiliate_url: data.product_url,
      script_text: data.script_text,
      script_hook: data.script_hook,
      status: 'pending',
      scheduled_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[VIDEO] Erro ao criar fila: ${error.message}`);
    return null;
  }
  return result.id;
}

async function generateReviewVideoJob(review: {
  slug: string;
  product: string;
  category: string;
  price_new: string;
  image_url: string;
  affiliate_url: string;
}): Promise<VideoJobResult> {
  try {
    console.log(`[VIDEO] Gerando script para review: ${review.product}`);

    const script = await generateVideoScript({
      title: review.product,
      category: review.category,
      price: review.price_new,
      marketplace: 'Mercado Livre',
    });

    const videoId = await createVideoQueueEntry({
      product_title: review.product,
      product_category: review.category,
      product_price: review.price_new,
      product_image_url: review.image_url,
      product_url: review.affiliate_url || `https://vetor.blog/reviews/${review.slug}`,
      type: 'review',
      slug: review.slug,
      script_hook: script.hook,
      script_text: JSON.stringify(script),
    });

    if (!videoId) {
      return { type: 'review', slug: review.slug, status: 'failed', error: 'Falha ao criar entrada na fila' };
    }

    console.log(`[VIDEO] Script gerado para ${review.product} | Hook: ${script.hook}`);
    return { type: 'review', slug: review.slug, status: 'queued', videoId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VIDEO] Erro ao gerar script para ${review.slug}:`, message);
    return { type: 'review', slug: review.slug, status: 'failed', error: message };
  }
}

async function generateComparisonVideoJob(article: {
  slug: string;
  title: string;
  category: string;
  products: Array<{ name: string; slug: string; imageUrl: string; product_url?: string }>;
}): Promise<VideoJobResult> {
  try {
    const productNames = article.products.map(p => p.name).join(' vs ');
    console.log(`[VIDEO] Gerando script para comparativo: ${productNames}`);

    const script = await generateVideoScript({
      title: `${article.title} - Comparativo Completo`,
      category: article.category,
      price: 'Comparativo',
      marketplace: 'Mercado Livre',
    });

    const firstProduct = article.products[0];
    const videoId = await createVideoQueueEntry({
      product_title: productNames,
      product_category: article.category,
      product_price: 'Comparativo',
      product_image_url: firstProduct.imageUrl,
      product_url: firstProduct.product_url || `https://vetor.blog/comparativos/${article.slug}`,
      type: 'comparison',
      slug: article.slug,
      script_hook: script.hook,
      script_text: JSON.stringify(script),
    });

    if (!videoId) {
      return { type: 'comparison', slug: article.slug, status: 'failed', error: 'Falha ao criar entrada na fila' };
    }

    console.log(`[VIDEO] Script gerado para comparativo ${productNames} | Hook: ${script.hook}`);
    return { type: 'comparison', slug: article.slug, status: 'queued', videoId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[VIDEO] Erro ao gerar script para comparativo ${article.slug}:`, message);
    return { type: 'comparison', slug: article.slug, status: 'failed', error: message };
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results: VideoJobResult[] = [];

    // Gerar videos para os 8 reviews mais recentes
    const reviews = await getAllReviews();
    const recentReviews = reviews.slice(0, 8);

    for (const review of recentReviews) {
      const result = await generateReviewVideoJob({
        slug: review.slug,
        product: review.product,
        category: review.category,
        price_new: review.price_new,
        image_url: review.image_url,
        affiliate_url: review.affiliate_url,
      });
      results.push(result);
    }

    // Gerar videos para os 8 comparativos mais recentes
    const viralArticles = await getAllViralArticles();
    const recentComparisons = viralArticles.slice(0, 8);

    for (const article of recentComparisons) {
      const products = Array.isArray(article.products) ? article.products : [];
      if (products.length < 2) continue;

      const result = await generateComparisonVideoJob({
        slug: article.slug,
        title: article.title,
        category: article.category,
        products,
      });
      results.push(result);
    }

    const queued = results.filter(r => r.status === 'queued').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`[VIDEO-CRON] Resultado: ${queued} enfileirados, ${failed} falharam`);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalJobs: results.length,
      queued,
      failed,
      results,
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
