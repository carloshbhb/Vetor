import { getPublishedReviewCards } from '@/lib/db';
import { NEXT_PUBLIC_SITE_URL } from '@/lib/env';
import type { ReviewCard } from '@/lib/db';

export const revalidate = 3600;

function formatRFC3339(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString();
}

export async function GET() {
  const baseUrl = NEXT_PUBLIC_SITE_URL.startsWith('http')
    ? NEXT_PUBLIC_SITE_URL
    : `https://${NEXT_PUBLIC_SITE_URL}`;

  let reviews: ReviewCard[];
  try {
    reviews = await getPublishedReviewCards();
  } catch {
    reviews = [];
  }

  const items = reviews.map(r => {
    return `
    <item>
      <title>${escapeXml(r.metaTitle)}</title>
      <description>${escapeXml(r.metaDescription)}</description>
      <link>${baseUrl}/review/${r.slug}</link>
      <guid>${baseUrl}/review/${r.slug}</guid>
      <pubDate>${formatRFC3339(r.updatedAt)}</pubDate>
      <dc:creator>Henrique Vetor</dc:creator>
      <category>${escapeXml(r.category || 'Geral')}</category>
      <enclosure url="${r.imageUrl || `${baseUrl}/og-default.jpg`}" length="0" type="image/jpeg"/>
    </item>`;
  }).join('\n');

  const rssUrl = `${baseUrl}/rss.xml`;
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vetor Blog - Reviews de Produtos</title>
    <description>Reviews imparciais de tecnologia, wearables, games e eletrônicos</description>
    <link>${baseUrl}</link>
    <atom:link href="${rssUrl}" rel="self" type="application/rss+xml"/>
    <language>pt-BR</language>
    <lastBuildDate>${formatRFC3339(new Date().toISOString())}</lastBuildDate>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>Vetor Blog</title>
      <link>${baseUrl}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}