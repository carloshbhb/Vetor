import { getPublishedReviews } from '@/lib/db';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  const reviews = await getPublishedReviews();

  const reviewUrls = reviews.map((r) => `
    <url>
      <loc>${baseUrl}/review/${r.slug}</loc>
      <lastmod>${r.updatedAt || r.createdAt}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${reviewUrls}
</urlset>`;

  return new Response(sitemapXml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}