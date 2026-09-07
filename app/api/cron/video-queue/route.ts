import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';
import { generateVideoScript } from '@/lib/video-script';
import {
  DAILY_VIDEO_LIMIT,
  getPublishedJobSlugs,
  getJobsTodayCount,
  upsertScriptJob,
  getPendingJobs,
} from '@/lib/video-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET /api/cron/video-queue?token=CRON_SECRET&limit=30&batch=3
// Gera roteiros em LOTES pequenos por invocação (padrão 3) para não estourar
// o timeout da serverless na Vercel. `limit` = teto do dia; `batch` = quantos
// roteiros gerar NESTA chamada. Backlog primeiro (mais antigos), depois os novos.
// Roda leve na Vercel (só IA + banco). Render/upload fica no worker.
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
    // Inclui script_ready como "feito" para não regenerar os mesmos roteiros
    const doneSlugs = await getPublishedJobSlugs();
    const pendingJobs = await getPendingJobs(limit * 2);
    const pendingSlugs = new Set(pendingJobs.map((j) => j.slug));
    Array.from(pendingSlugs).forEach((slug) => doneSlugs.add(slug));

    // Backlog primeiro: mais antigos sem vídeo (reviews vem desc; invertemos)
    const backlog = [...reviews].reverse().filter((r) => !doneSlugs.has(r.slug));
    // Lote pequeno por invocação para caber no timeout da serverless
    const batchSize = Math.min(
      Math.max(Number(req.nextUrl.searchParams.get('batch') || 3), 1),
      remaining
    );
    const batch = backlog.slice(0, batchSize);

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
        ? 'No seu PC rode: node scripts/video-worker.mjs (renderiza + publica os script_ready, até 30/dia)'
        : 'Nada pendente — amanhã o cron pega os reviews novos do dia.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
