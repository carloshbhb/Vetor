import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';
import { generateVideoScript } from '@/lib/video-script';
import {
  DAILY_VIDEO_LIMIT,
  getPublishedJobSlugs,
  getJobsTodayCount,
  upsertScriptJob,
} from '@/lib/video-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET /api/cron/video-queue?token=CRON_SECRET&limit=6
// Gera até 6 roteiros/dia (cota grátis YouTube). Backlog primeiro (mais antigos),
// depois os novos. Roda leve na Vercel (só IA + banco). Render/upload fica no worker local.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get('limit') || DAILY_VIDEO_LIMIT),
    DAILY_VIDEO_LIMIT
  );

  try {
    const publishedToday = await getJobsTodayCount();
    const remaining = limit - publishedToday;
    if (remaining <= 0) {
      return NextResponse.json({ success: true, message: `Cota do dia cheia (${publishedToday}/${limit})`, jobs: [] });
    }

    const reviews = await getPublishedReviews();
    const doneSlugs = await getPublishedJobSlugs();
    // Backlog primeiro: mais antigos sem vídeo (reviews vem desc; invertemos)
    const backlog = [...reviews].reverse().filter((r) => !doneSlugs.has(r.slug));
    const batch = backlog.slice(0, remaining);

    const jobs: any[] = [];
    const errors: any[] = [];
    for (const review of batch) {
      try {
        const script = await generateVideoScript(review);
        await upsertScriptJob({
          review_id: review.id,
          slug: review.slug,
          product: review.product,
          status: 'script_ready',
          script,
        });
        jobs.push({ slug: review.slug, product: review.product, title: script.title });
      } catch (e: any) {
        errors.push({ slug: review.slug, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fila: ${jobs.length} roteiros prontos (${publishedToday} já publicados hoje). Backlog restante: ${backlog.length - jobs.length}.`,
      jobs,
      errors,
      nextStep: jobs.length
        ? 'No seu PC rode: node scripts/video-worker.mjs (renderiza + publica os script_ready, até 6/dia)'
        : 'Nada pendente — amanhã o cron pega os reviews novos do dia.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
