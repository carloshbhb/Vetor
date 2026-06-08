import { getPublishedReviews } from '@/lib/db';

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const revalidate = 3600;

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vetor.blog';
  const baseUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  let reviews: Awaited<ReturnType<typeof getPublishedReviews>> = [];
  try {
    reviews = await getPublishedReviews();
  } catch (e) {
    console.error('[Sitemap] Error fetching reviews:', e);
  }

  const now = new Date().toISOString();

  // Páginas estáticas
  const staticUrls = [
    { path: '/', priority: '1.0', freq: 'daily' },
    { path: '/research', priority: '0.6', freq: 'weekly' },
    { path: '/sobre', priority: '0.5', freq: 'monthly' },
    { path: '/privacidade', priority: '0.3', freq: 'yearly' },
    { path: '/termos', priority: '0.3', freq: 'yearly' },
  ].map(p => `
  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

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
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticUrls}${categoryUrls}${reviewUrls}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}