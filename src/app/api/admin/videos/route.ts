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

async function generateReviewVideo(review: {
  product: string;
  image_url: string;
  verdict_score: number;
  category: string;
}): Promise<{ url: string; filename: string }> {
  const timestamp = Date.now();
  const filename = `review-${review.product.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.mp4`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  return { url: `${baseUrl}/videos/${filename}`, filename };
}

async function generateComparisonVideo(products: { name: string; image: string; score: number }[]): Promise<{ url: string; filename: string }> {
  const timestamp = Date.now();
  const productNames = products.map((p) => p.name.toLowerCase().replace(/\s+/g, '-')).join('-vs-');
  const filename = `comparison-${productNames}-${timestamp}.mp4`;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  return { url: `${baseUrl}/videos/${filename}`, filename };
}

export async function GET() {
  try {
    const reviews = await getAllReviews();
    const articles = await getAllViralArticles();

    const reviewJobs: VideoJob[] = reviews.slice(0, 3).map((review) => ({
      id: `review-${review.slug}`,
      type: 'review' as const,
      status: 'completed' as const,
      url: `/reviews/${review.slug}`,
      createdAt: review.created_at,
    }));

    const comparisonJobs: VideoJob[] = articles.slice(0, 2).map((article) => ({
      id: `comparison-${article.slug}`,
      type: 'comparison' as const,
      status: 'completed' as const,
      url: `/comparativos/${article.slug}`,
      createdAt: article.created_at,
    }));

    const allJobs = [...reviewJobs, ...comparisonJobs];

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalJobs: allJobs.length,
      completed: allJobs.filter((j) => j.status === 'completed').length,
      failed: allJobs.filter((j) => j.status === 'failed').length,
      jobs: allJobs.slice(-10),
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type;

    const results: VideoJob[] = [];

    if (type === 'review' || !type) {
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

        try {
          const { url } = await generateReviewVideo({
            product: review.product,
            image_url: review.image_url,
            verdict_score: review.verdict_score,
            category: review.category,
          });
          job.status = 'completed';
          job.url = url;
          results.push(job);
        } catch (err: unknown) {
          job.status = 'failed';
          job.error = err instanceof Error ? err.message : String(err);
          results.push(job);
        }
      }
    }

    if (type === 'comparison' || !type) {
      const articles = await getAllViralArticles();
      const recentArticles = articles.slice(0, 2);

      for (const article of recentArticles) {
        const jobId = `comparison-${article.slug}-${Date.now()}`;
        const job: VideoJob = {
          id: jobId,
          type: 'comparison',
          status: 'processing',
          createdAt: new Date().toISOString(),
        };

        try {
          const products = Array.isArray(article.products) ? article.products.slice(0, 2) : [];
          if (products.length < 2) throw new Error('Not enough products');
          const productData = products.map((p: { name: string; imageUrl: string; score?: number }) => ({
            name: p.name,
            image: p.imageUrl,
            score: p.score || 8,
          }));
          const { url } = await generateComparisonVideo(productData);
          job.status = 'completed';
          job.url = url;
          results.push(job);
        } catch (err: unknown) {
          job.status = 'failed';
          job.error = err instanceof Error ? err.message : String(err);
          results.push(job);
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalJobs: results.length,
      completed: results.filter((r) => r.status === 'completed').length,
      failed: results.filter((r) => r.status === 'failed').length,
      results,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}