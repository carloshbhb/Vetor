import { NextResponse } from 'next/server';
import { getAllJobs, getJobsTodayCount, DAILY_VIDEO_LIMIT } from '@/lib/video-queue';
import { getPublishedReviews } from '@/lib/db';
import { getPublishedJobSlugs } from '@/lib/video-queue';

export const dynamic = 'force-dynamic';

// GET /api/video-jobs — dashboard simples da fila (quantos faltam, quantos hoje)
export async function GET() {
  const [jobs, today, reviews, done] = await Promise.all([
    getAllJobs(50),
    getJobsTodayCount(),
    getPublishedReviews(),
    getPublishedJobSlugs(),
  ]);
  const backlog = reviews.filter((r) => !done.has(r.slug)).length;
  return NextResponse.json({
    today: `${today}/${DAILY_VIDEO_LIMIT}`,
    backlogRemaining: backlog,
    totalReviews: reviews.length,
    withVideo: done.size,
    jobs,
  });
}
