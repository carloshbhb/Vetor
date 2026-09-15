import { NextRequest, NextResponse } from 'next/server';
import { processVideoPipeline, getPendingVideos, processPendingVideos } from '@/lib/video-orchestrator';
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
    const { videoId, processAll } = body;

    if (videoId) {
      const result = await processVideoPipeline(videoId);
      return NextResponse.json(result);
    }

    if (processAll) {
      await processPendingVideos(5);
      return NextResponse.json({ success: true, message: 'Processing all pending videos' });
    }

    return NextResponse.json({ error: 'videoId or processAll is required' }, { status: 400 });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
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

    const videos = await getPendingVideos(10);
    return NextResponse.json({ 
      pending: videos.length,
      videos: videos.map(v => ({
        id: v.id,
        title: v.product_title,
        category: v.product_category,
        price: v.product_price,
        scheduled: v.scheduled_at,
      })),
    });
  } catch (error) {
    console.error('Error checking pending videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check pending videos' },
      { status: 500 }
    );
  }
}