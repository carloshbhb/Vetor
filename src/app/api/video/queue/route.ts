import { NextRequest, NextResponse } from 'next/server';
import { createVideoJob, getPendingVideos, processVideoPipeline, getVideoById, updateVideoStatus, createVideoJobsFromBestSellers } from '@/lib/video-orchestrator';
import { verifyAdminAuth } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    } else {
      const authError = verifyAdminAuth(request);
      if (authError) return authError;
    }

    const body = await request.json();
    const { productUrl, scheduledAt, bestSellers } = body;

    if (bestSellers) {
      const count = await createVideoJobsFromBestSellers(bestSellers);
      return NextResponse.json({ success: true, created: count });
    }

    if (!productUrl) {
      return NextResponse.json({ error: 'productUrl is required' }, { status: 400 });
    }

    const urlPattern = /^https?:\/\/(www\.)?(amazon\.(com\.br|com)|shopee\.(com\.br|com)|mercadolivre\.com\.br|mercadolibre\.)/i;
    if (!urlPattern.test(productUrl)) {
      return NextResponse.json({ error: 'Invalid URL. Must be Amazon, Shopee, or Mercado Livre product link.' }, { status: 400 });
    }

    const video = await createVideoJob({ productUrl, scheduledAt });
    
    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        product_title: video.product_title,
        product_category: video.product_category,
        product_price: video.product_price,
        status: video.status,
        created_at: video.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating video job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create video job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    } else {
      const authError = verifyAdminAuth(request);
      if (authError) return authError;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (id) {
      const video = await getVideoById(id);
      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
      return NextResponse.json({ video });
    }

    if (status === 'pending') {
      const videos = await getPendingVideos(limit);
      return NextResponse.json({ videos, count: videos.length });
    }

    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching video queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch video queue' },
      { status: 500 }
    );
  }
}