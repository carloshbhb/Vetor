import { getPublishedReviews } from '@/lib/db';

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const revalidate = 3600;

async function submitToIndexNow(urls: string[]) {
  try {
    const { submitUrls } = await import('@/lib/indexnow');
    await submitUrls(urls);
  } catch (e) {
    console.error('[Sitemap] IndexNow error:', e);
  }
}

async function pingGscSitemap() {
  try {
    const { submitSitemap } = await import('@/lib/search-console');
    const result = await submitSitemap('sitemap.xml');
    if (result.success) {
      console.log('[Sitemap] GSC sitemap submitted:', result.message);
    }
  } catch (e) {
    console.error('[Sitemap] GSC ping error:', e);
  }
}

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

  const staticUrls = [
    { path: '/', priority: '1.0', freq: 'daily', images: [`${baseUrl}/og-default.jpg`] },
    { path: '/research', priority: '0.6', freq: 'weekly', images: [] },
    { path: '/sobre', priority: '0.5', freq: 'monthly', images: [] },
    { path: '/privacidade', priority: '0.3', freq: 'yearly', images: [] },
    { path: '/termos', priority: '0.3', freq: 'yearly', images: [] },
  ];

  const staticUrlXml = staticUrls.map(p => {
    const imageTags = p.images.map(img =>
      `<image:image><image:loc>${img}</image:loc><image:caption>${baseUrl}</image:caption></image:image>`
    ).join('');
    const hreflangTags = `
    <xhtml:link rel="alternate" hreflang="pt-BR" href="${baseUrl}${p.path}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}${p.path}" />`;
    return `
  <url>
    <loc>${baseUrl}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
    ${imageTags}${hreflangTags}
  </url>`;
  }).join('');

  const reviewUrls = reviews.map(r => {
    const imageTag = r.imageUrl ?
      `<image:image><image:loc>${r.imageUrl}</image:loc><image:caption>${r.product}</image:caption></image:image>` : '';
    return `
  <url>
    <loc>${baseUrl}/review/${r.slug}</loc>
    <lastmod>${r.updatedAt || r.createdAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    ${imageTag}
  </url>`;
  }).join('');

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${staticUrlXml}${categoryUrls}${reviewUrls}
</urlset>`;

  const allUrls = [
    ...staticUrls.map(p => `${baseUrl}${p.path}`),
    ...categories.map(cat => `${baseUrl}/categoria/${slugify(cat)}`),
    ...reviews.map(r => `${baseUrl}/review/${r.slug}`),
  ];
  submitToIndexNow(allUrls);
  pingGscSitemap();

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
