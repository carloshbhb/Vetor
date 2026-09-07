import { NextRequest, NextResponse } from 'next/server';
import { getPublishedSlugQueue, getReviewsBySlugs } from '@/lib/db';
import { generateVideoScript } from '@/lib/video-script';
import {
  DAILY_VIDEO_LIMIT,
  getAllJobSlugs,
  getFailedSlugs,
  getJobsTodayCount,
  upsertScriptJob,
} from '@/lib/video-queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET responde sempre fresco: sem isso o CDN da Vercel pode servir resposta
// GET cacheada de chamada anterior (foi o que gerou "Cota (6/1)" fantasma).
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

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
      return NextResponse.json(
        {
          v: 'dedup-v2',
          db: (process.env.NEXT_PUBLIC_SUPABASE_URL || 'none').slice(-6),
          success: true,
          message: `Cota do dia cheia (${publishedToday}/${limit})`,
          jobs: [],
        },
        { headers: NO_STORE }
      );
    }

    // Queries leves primeiro: fila de slugs (só slug+data) + slugs já na fila.
    // O review COMPLETO (pesado) é buscado só para os slugs do lote — antes
    // o cron puxava os 113 reviews inteiros e estourava o timeout da Vercel.
    const [queue, doneSlugs, retrySlugs] = await Promise.all([
      getPublishedSlugQueue(),
      getAllJobSlugs(),
      getFailedSlugs(3),
    ]);
    const forceSlug = req.nextUrl.searchParams.get('force') || '';
    if (forceSlug) doneSlugs.delete(forceSlug);

    // Backlog primeiro: mais antigos sem vídeo. Retries de falhas (attempts<3)
    // vêm antes, senão um job falhado nunca mais seria pego.
    const fresh = queue.filter((q) => !doneSlugs.has(q.slug)).map((q) => q.slug);
    const retry = retrySlugs.filter((s) => !fresh.includes(s));
    const backlogSlugs = [...retry, ...fresh];
    // Lote pequeno por invocação para caber no timeout da serverless
    const batchSize = Math.min(
      Math.max(Number(req.nextUrl.searchParams.get('batch') || 3), 1),
      remaining
    );
    const batchSlugs = backlogSlugs.slice(0, batchSize);
    const batch = await getReviewsBySlugs(batchSlugs);

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

    return NextResponse.json(
      {
        v: 'dedup-v2',
        // fingerprint não-sensível do banco lido (últimos 6 chars da URL pública)
        // p/ diagnosticar se Vercel e worker enxergam o mesmo Supabase
        db: (process.env.NEXT_PUBLIC_SUPABASE_URL || 'none').slice(-6),
        success: true,
        message: `Fila: ${jobs.length} roteiros prontos (${publishedToday} já publicados hoje). Backlog restante: ${backlogSlugs.length - jobs.length}.`,
        jobs,
        skipped,
        errors,
        nextStep: jobs.length
          ? 'No seu PC rode: node scripts/video-worker.mjs (renderiza + publica os script_ready, até 30/dia)'
          : 'Nada pendente — amanhã o cron pega os reviews novos do dia.',
      },
      { headers: NO_STORE }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
