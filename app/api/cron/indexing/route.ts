import { NextRequest, NextResponse } from 'next/server';
import { submitUrls } from '@/lib/indexnow';
import { indexAllPages } from '@/lib/google-indexing';
import { getPublishedReviewCards } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.nextUrl.searchParams.get('token');

  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const SITE_URL = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  // Só reviews recentes (últimas 30h) + estáticas (1x/semana)
  const reviews = await getPublishedReviewCards();
  const recentHours = Number(process.env.INDEXING_RECENT_HOURS || 8);
  const cap = Number(process.env.INDEXING_CAP || 90);
  const cutoff = Date.now() - recentHours * 3600_000;
  const isMonday = new Date().getUTCDay() === 1;

  const fresh = reviews.filter(r => {
    const created = r.createdAt ? new Date(r.createdAt).getTime() : 0;
    const updated = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
    return Math.max(created, updated) >= cutoff;
  });

  // IndexNow: só recentes + estáticas (mesmo filtro do Google)
  const indexNowUrls = [
    ...fresh.map(r => `${SITE_URL}/review/${r.slug}`),
  ];

  if (isMonday) {
    indexNowUrls.push(
      SITE_URL,
      `${SITE_URL}/research`,
      `${SITE_URL}/sobre`,
      `${SITE_URL}/privacidade`,
      `${SITE_URL}/termos`,
    );
    const categories = Array.from(new Set(reviews.map(r => r.category || 'Geral')));
    const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    indexNowUrls.push(...categories.map(cat => `${SITE_URL}/categoria/${slugify(cat)}`));
  }

  const cappedUrls = indexNowUrls.slice(0, cap);

  let results = { google: { indexed: 0, errors: 0 }, indexNow: { success: 0, failed: 0 } };

  try {
    const googleResult = await indexAllPages();
    results.google = googleResult;
  } catch (e) {
    console.error('[Cron] Google Indexing error:', e);
  }

  try {
    const indexNowResult = await submitUrls(cappedUrls);
    results.indexNow = indexNowResult;
  } catch (e) {
    console.error('[Cron] IndexNow error:', e);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    urlsProcessed: cappedUrls.length,
    ...results,
  });
}
