import type { MetadataRoute } from 'next';
import { fetchAllReviews, fetchAllViralArticles, fetchCategories } from '@/lib/data';
import { authors } from '@/data/authors';
import { buildTagIndex } from '@/lib/tags';
import { buildBuyingGuideCategories, buildBuyingIntentPages } from '@/lib/buying';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, viralArticles, categories] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
    fetchCategories(),
  ]);

  const baseUrl = 'https://www.vetor.blog';

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/reviews/`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/melhores/`,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparativos/`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sobre/`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacidade/`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contato/`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/author/`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/tags/`,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/guias/`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ofertas/`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/como-avaliamos/`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/politica-editorial/`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/afiliados/`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/termos/`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  const reviewPages: MetadataRoute.Sitemap = reviews.map((r) => ({
    url: `${baseUrl}/reviews/${r.slug}/`,
    lastModified: new Date(r.updated_at || r.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const viralPages: MetadataRoute.Sitemap = viralArticles.map((a) => ({
    url: `${baseUrl}/comparativos/${a.slug}/`,
    lastModified: new Date(a.updated_at || a.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/reviews/categoria/${encodeURIComponent(c.name)}/`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const buyingGuidePages: MetadataRoute.Sitemap = buildBuyingGuideCategories(reviews, 3).map((category) => ({
    url: `${baseUrl}/melhores/${category.slug}/`,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }));

  const buyingIntentPages: MetadataRoute.Sitemap = buildBuyingIntentPages(reviews, 4).map((item) => ({
    url: `${baseUrl}/melhores/${item.categorySlug}/${item.intent}/`,
    lastModified: new Date(
      Math.max(
        ...item.reviews.map((review) =>
          new Date(review.updated_at || review.created_at).getTime()
        )
      )
    ),
    changeFrequency: 'weekly' as const,
    priority: 0.78,
  }));

  const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${baseUrl}/author/${a.slug}/`,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const tagIndex = buildTagIndex(reviews);
  const tagPages: MetadataRoute.Sitemap = tagIndex.map((t) => ({
    url: `${baseUrl}/tags/${t.slug}/`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...reviewPages,
    ...viralPages,
    ...categoryPages,
    ...buyingGuidePages,
    ...buyingIntentPages,
    ...authorPages,
    ...tagPages,
  ];
}
