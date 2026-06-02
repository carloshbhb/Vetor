import { getPublishedReviews } from '@/lib/db';

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const revalidate = 3600;

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const reviews = await getPublishedReviews();

  // Reviews
  const reviewUrls = reviews.map((r) => `
    <url>
      <loc>${baseUrl}/review/${r.slug}</loc>
      <lastmod>${r.updatedAt || r.createdAt}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`).join('');

  // Categorias únicas
  const categories = Array.from(new Set(reviews.map(r => r.category || 'Geral')));
  const categoryUrls = categories.map(cat => {
    const slug = slugify(cat);
    return `
    <url>
      <loc>${baseUrl}/categoria/${slug}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.7</priority>
    </url>`;
  }).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/research</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>${categoryUrls}${reviewUrls}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}