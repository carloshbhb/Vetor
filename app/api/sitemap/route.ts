import { NextResponse } from 'next/server';
import { getPublishedReviews } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reviews = await getPublishedReviews();
    const urls = reviews.map(r => `<url><loc>https://vetor.blog/review/${r.slug}</loc></url>`).join('');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
    return new NextResponse(xml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (err: any) {
    console.error('[Sitemap] Error generating sitemap:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate sitemap' }, { status: 500 });
  }
}
