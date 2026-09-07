import { NextRequest, NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';
import { generateVideoScript } from '@/lib/video-script';
import {
  DAILY_VIDEO_LIMIT,
  getAllJobSlugs,
  getJobsTodayCount,
  upsertScriptJob,
} from '@/lib/video-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET /api/cron/video-queue?token=CRON_SECRET&limit=30&batch=3[&force=slug]
// Gera roteiros em LOTES pequenos por invocação (padrão 3) para não estourar
// o timeout da serverless na Vercel. `limit` = teto do dia; `batch` = quantos
// roteiros gerar NESTA chamada. Backlog primeiro (mais antigos), depois os novos.
// REGRA 1 review = 1 vídeo: slugs que já têm linha em video_jobs (qualquer status)
// NUNCA são regenerados — exceto via `force=slug` (conteúdo novo/atualizado do
// mesmo review, que gera um vídeo novo de propósito).
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
    // 1 review = 1 vídeo: exclui TODOS os slugs que já têm linha na fila
    // (script_ready, rendering, published, failed). Assim um timeout parcial
    // do cron nunca recria roteiro de review que já tem vídeo.
    const doneSlugs = await getAllJobSlugs();
    const forceSlug = req.nextUrl.searchParams.get('force') || '';
    if (forceSlug) doneSlugs.delete(forceSlug);

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
    const skipped: string[] = [];
    for (const review of batch) {
      try {
        const script = await generateVideoScript(review);
        const res = await upsertScriptJob(
          {
            review_id: review.id,
            slug: review.slug,
            product: review.product,
            status: 'script_ready',
            script,
          },
          forceSlug && review.slug === forceSlug ? { force: true } : undefined
        );
        if (res === 'skipped') {
          skipped.push(review.slug);
          continue;
        }
        jobs.push({ slug: review.slug, product: review.product, title: script.title });
      } catch (e: any) {
        errors.push({ slug: review.slug, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fila: ${jobs.length} roteiros prontos (${publishedToday} já publicados hoje). Backlog restante: ${backlog.length - jobs.length}.`,
      jobs,
      skipped,
      errors,
      nextStep: jobs.length
        ? 'No seu PC rode: node scripts/video-worker.mjs (renderiza + publica os script_ready, até 30/dia)'
        : 'Nada pendente — amanhã o cron pega os reviews novos do dia.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
