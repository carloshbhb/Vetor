import { NextRequest, NextResponse } from 'next/server';
import { processPendingVideos, getPendingVideos } from '@/lib/video-orchestrator';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pending = await getPendingVideos(10);
    
    if (pending.length === 0) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        message: 'Nenhum vídeo pendente',
        pending: 0,
        processed: 0,
      });
    }

    // Process up to 3 videos per cron run (avoid timeout)
    await processPendingVideos(3);
    
    const remaining = await getPendingVideos(10);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      message: `Processamento iniciado para ${Math.min(3, pending.length)} vídeos`,
      pending_before: pending.length,
      pending_after: remaining.length,
      processed: pending.length - remaining.length,
    });
  } catch (error) {
    console.error('Error in process-videos cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process videos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}