import { NextRequest, NextResponse } from 'next/server';
import { submitUrls } from '@/lib/indexnow';
import { indexAllPages } from '@/lib/google-indexing';
import { getPublishedReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const SITE_URL = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  const reviews = await getPublishedReviews();
  const allUrls = [
    SITE_URL,
    `${SITE_URL}/research`,
    `${SITE_URL}/sobre`,
    `${SITE_URL}/privacidade`,
    `${SITE_URL}/termos`,
    ...reviews.map(r => `${SITE_URL}/review/${r.slug}`),
  ];

  const categories = Array.from(new Set(reviews.map(r => r.category || 'Geral')));
  const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const categoryUrls = categories.map(cat => `${SITE_URL}/categoria/${slugify(cat)}`);

  const allIndexableUrls = [...allUrls, ...categoryUrls];

  let results = { google: { indexed: 0, errors: 0 }, indexNow: { success: 0, failed: 0 } };

  try {
    const googleResult = await indexAllPages();
    results.google = googleResult;
  } catch (e) {
    console.error('[Cron] Google Indexing error:', e);
  }

  try {
    const indexNowResult = await submitUrls(allIndexableUrls);
    results.indexNow = indexNowResult;
  } catch (e) {
    console.error('[Cron] IndexNow error:', e);
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    urlsProcessed: allIndexableUrls.length,
    ...results,
  });
}
