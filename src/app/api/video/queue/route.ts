import { NextRequest, NextResponse } from 'next/server';
import { createVideoJob, getPendingVideos, processVideoPipeline, getVideoById, createVideoJobsFromBestSellers, getVideoQueueStats, listVideoQueue, retryFailedVideo, updateVideoStatus } from '@/lib/video-orchestrator';
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
    const visualStyle = body.visualStyle === 'stickman' ? 'stickman' : 'standard';
    const validEngines = new Set(['auto', 'remotion', 'hyperframes', 'lemo-opuscar']);
    const renderEngine = typeof body.renderEngine === 'string' && validEngines.has(body.renderEngine) ? body.renderEngine : 'auto';
    if (body.renderEngine !== undefined && !validEngines.has(body.renderEngine)) {
      return NextResponse.json({ error: 'Motor de renderização inválido.' }, { status: 400 });
    }
    if (visualStyle === 'stickman' && !['auto', 'remotion'].includes(renderEngine)) {
      return NextResponse.json({ error: 'O estilo Stickman é exclusivo do Remotion.' }, { status: 400 });
    }

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

    const video = await createVideoJob({ productUrl, scheduledAt, visualStyle, renderEngine });
    
    return NextResponse.json({
      success: true,
      video: {
        id: video.id,
        product_title: video.product_title,
        product_category: video.product_category,
        product_price: video.product_price,
        status: video.status,
        visual_style: visualStyle,
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
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const parsedOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
    const offset = Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0;

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

    if (status && !['processing', 'completed', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const [page, stats] = await Promise.all([
      listVideoQueue({ limit, offset, ...(status ? { status: status as 'processing' | 'completed' | 'failed' } : {}) }),
      getVideoQueueStats(),
    ]);
    return NextResponse.json({ videos: page.videos, total: page.total, offset, limit: Math.min(Math.max(limit, 1), 100), stats });
  } catch (error) {
    console.error('Error fetching video queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch video queue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = verifyAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    if (typeof body.renderEngine === 'string') {
      const validEngines = new Set(['auto', 'remotion', 'hyperframes', 'lemo-opuscar']);
      if (!validEngines.has(body.renderEngine)) {
        return NextResponse.json({ error: 'Motor de renderização inválido.' }, { status: 400 });
      }
      const video = await getVideoById(id);
      if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      if (!['pending', 'failed'].includes(video.status)) {
        return NextResponse.json({ error: 'O motor só pode ser alterado enquanto o vídeo estiver na fila ou com falha.' }, { status: 409 });
      }
      if (Array.isArray(video.media_assets) && video.media_assets.some((item: any) => item?.type === 'visual_style' && item?.style === 'stickman') &&
          !['auto', 'remotion'].includes(body.renderEngine)) {
        return NextResponse.json({ error: 'O estilo Stickman é exclusivo do Remotion.' }, { status: 400 });
      }
      if (video.media_assets != null && !Array.isArray(video.media_assets)) {
        return NextResponse.json({ error: 'Este vídeo tem metadados de mídia legados; não alterei os dados para evitar perda de assets.' }, { status: 409 });
      }
      const assets = Array.isArray(video.media_assets) ? video.media_assets.filter((item: any) => item?.type !== 'render_engine') : [];
      if (body.renderEngine !== 'auto') assets.push({ type: 'render_engine', requested: body.renderEngine });
      await updateVideoStatus(id, { media_assets: assets });
      return NextResponse.json({ success: true, renderEngine: body.renderEngine });
    }

    const retried = await retryFailedVideo(id);
    if (!retried) return NextResponse.json({ error: 'Failed video not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retry video' },
      { status: 500 }
    );
  }
}
