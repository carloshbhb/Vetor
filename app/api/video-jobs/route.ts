import { NextResponse } from 'next/server';
import { getAllJobs, getJobsTodayCount, DAILY_VIDEO_LIMIT } from '@/lib/video-queue';
import { getPublishedSlugs } from '@/lib/db';
import { getPublishedJobSlugs } from '@/lib/video-queue';

export const dynamic = 'force-dynamic';

// GET /api/video-jobs — dashboard simples da fila (quantos faltam, quantos hoje)
export async function GET() {
  const [jobs, today, slugs, done] = await Promise.all([
    getAllJobs(50),
    getJobsTodayCount(),
    getPublishedSlugs(),
    getPublishedJobSlugs(),
  ]);
  // Só slugs (query leve) — antes puxava os 113 reviews inteiros só p/ contar
  const backlog = slugs.filter((s) => !done.has(s)).length;
  return NextResponse.json({
    today: `${today}/${DAILY_VIDEO_LIMIT}`,
    backlogRemaining: backlog,
    totalReviews: slugs.length,
    withVideo: done.size,
    jobs,
  });
}
