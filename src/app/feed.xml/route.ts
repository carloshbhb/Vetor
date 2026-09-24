import { fetchAllReviews, fetchAllViralArticles } from '@/lib/data';

export const revalidate = 3600;

const BASE_URL = 'https://www.vetor.blog';
const MAX_ITEMS = 20;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateString: string | undefined): string {
  const date = dateString ? new Date(dateString) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
}

export async function GET(): Promise<Response> {
  const [reviews, viralArticles] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
  ]);

  const reviewItems: FeedItem[] = reviews
    .filter((r) => !r.status || r.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, MAX_ITEMS)
    .map((r) => ({
      title: r.meta_title || r.product,
      link: `${BASE_URL}/reviews/${r.slug}`,
      description: r.hero_lead || r.meta_description || '',
      pubDate: toRfc822(r.created_at),
      category: r.category,
    }));

  const viralItems: FeedItem[] = viralArticles
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 10)
    .map((a) => ({
      title: a.seo_title || a.title,
      link: `${BASE_URL}/comparativos/${a.slug}`,
      description: a.seo_description || a.description || '',
      pubDate: toRfc822(a.created_at),
      category: a.category,
    }));

  const items = [...reviewItems, ...viralItems];

  const itemsXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate}</pubDate>${
        item.category ? `\n      <category>${escapeXml(item.category)}</category>` : ''
      }
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>vetor.blog — Reviews e Comparativos</title>
    <link>${BASE_URL}</link>
    <description>Reviews profissionais, comparativos e recomendações de compra. Escolha com confiança.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
