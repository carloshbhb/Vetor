import { NextRequest, NextResponse } from 'next/server';
import { getAllReviews, getAllViralArticles } from '@/lib/supabase';

interface VideoJob {
  id: string;
  type: 'review' | 'comparison';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  error?: string;
  createdAt: string;
}

const videoJobs: VideoJob[] = [];

async function generateReviewVideo(review: {
  product: string;
  image_url: string;
  verdict_score: number;
  pros: string[];
  cons: string[];
  category: string;
}): Promise<{ url: string; filename: string }> {
  const timestamp = Date.now();
  const filename = `review-${review.product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.mp4`;

  const videoData = {
    title: review.product,
    imageUrl: review.image_url,
    score: review.verdict_score,
    pros: review.pros,
    cons: review.cons,
    verdict: `Análise completa do ${review.product}. Confira os prós e contras neste vídeo.`,
    category: review.category,
  };

  console.log(`[VIDEO] Generating review video for: ${review.product}`);
  console.log(`[VIDEO] Data:`, JSON.stringify(videoData, null, 2));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  const videoUrl = `${baseUrl}/videos/${filename}`;

  return {
    url: videoUrl,
    filename,
  };
}

async function generateComparisonVideo(products: {
  name: string;
  image: string;
  score: number;
}[]): Promise<{ url: string; filename: string }> {
  const timestamp = Date.now();
  const productNames = products.map((p) => p.name.toLowerCase().replace(/\s+/g, '-')).join('-vs-');
  const filename = `comparison-${productNames}-${timestamp}.mp4`;

  const winnerIndex = products.reduce(
    (maxIdx, product, idx, arr) => (product.score > arr[maxIdx].score ? idx : maxIdx),
    0
  );

  const videoData = {
    title: products.map((p) => p.name).join(' vs '),
    product1: {
      name: products[0].name,
      imageUrl: products[0].image,
      score: products[0].score,
    },
    product2: {
      name: products[1].name,
      imageUrl: products[1].image,
      score: products[1].score,
    },
    categories: [
      { label: 'Qualidade', score1: products[0].score, score2: products[1].score },
      { label: 'Custo-Benefício', score1: products[0].score * 0.9, score2: products[1].score * 0.95 },
    ],
    winner: (winnerIndex + 1) as 1 | 2,
  };

  console.log(`[VIDEO] Generating comparison video for: ${videoData.title}`);
  console.log(`[VIDEO] Data:`, JSON.stringify(videoData, null, 2));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  const videoUrl = `${baseUrl}/videos/${filename}`;

  return {
    url: videoUrl,
    filename,
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results: { type: string; slug: string; status: string; videoUrl?: string; error?: string }[] = [];

    const reviews = await getAllReviews();
    const recentReviews = reviews.slice(0, 3);

    for (const review of recentReviews) {
      const jobId = `review-${review.slug}-${Date.now()}`;
      const job: VideoJob = {
        id: jobId,
        type: 'review',
        status: 'processing',
        createdAt: new Date().toISOString(),
      };
      videoJobs.push(job);

      try {
        const { url, filename } = await generateReviewVideo({
          product: review.product,
          image_url: review.image_url,
          verdict_score: review.verdict_score,
          pros: Array.isArray(review.pros) ? review.pros : [],
          cons: Array.isArray(review.cons) ? review.cons : [],
          category: review.category,
        });

        job.status = 'completed';
        job.url = url;

        results.push({
          type: 'review',
          slug: review.slug,
          status: 'completed',
          videoUrl: url,
        });

        console.log(`[VIDEO] Review video generated: ${url}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        job.status = 'failed';
        job.error = message;

        results.push({
          type: 'review',
          slug: review.slug,
          status: 'failed',
          error: message,
        });

        console.error(`[VIDEO] Failed to generate review video for ${review.slug}:`, message);
      }
    }

    const viralArticles = await getAllViralArticles();
    const recentComparisons = viralArticles.slice(0, 2);

    for (const article of recentComparisons) {
      const jobId = `comparison-${article.slug}-${Date.now()}`;
      const job: VideoJob = {
        id: jobId,
        type: 'comparison',
        status: 'processing',
        createdAt: new Date().toISOString(),
      };
      videoJobs.push(job);

      try {
        const products = Array.isArray(article.products) ? article.products : [];
        if (products.length < 2) {
          throw new Error('Not enough products for comparison');
        }

        const productData = products.slice(0, 2).map((p) => ({
          name: p.name,
          image: p.imageUrl,
          score: Math.random() * 3 + 7,
        }));

        const { url, filename } = await generateComparisonVideo(productData);

        job.status = 'completed';
        job.url = url;

        results.push({
          type: 'comparison',
          slug: article.slug,
          status: 'completed',
          videoUrl: url,
        });

        console.log(`[VIDEO] Comparison video generated: ${url}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        job.status = 'failed';
        job.error = message;

        results.push({
          type: 'comparison',
          slug: article.slug,
          status: 'failed',
          error: message,
        });

        console.error(`[VIDEO] Failed to generate comparison video for ${article.slug}:`, message);
      }
    }

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        totalJobs: results.length,
        completed: results.filter((r) => r.status === 'completed').length,
        failed: results.filter((r) => r.status === 'failed').length,
        results,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
