import type { MetadataRoute } from 'next';
import { fetchAllReviews, fetchAllViralArticles, fetchCategories } from '@/lib/data';
import { authors } from '@/data/authors';
import { buildTagIndex } from '@/lib/tags';

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
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/reviews`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/comparativos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sobre`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/metodologia`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/contato`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/reviews/categoria`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/author`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  const reviewPages: MetadataRoute.Sitemap = reviews.map((r) => ({
    url: `${baseUrl}/reviews/${r.slug}`,
    lastModified: new Date(r.updated_at || r.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const viralPages: MetadataRoute.Sitemap = viralArticles.map((a) => ({
    url: `${baseUrl}/comparativos/${a.slug}`,
    lastModified: new Date(a.updated_at || a.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/reviews/categoria/${encodeURIComponent(c.name)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const authorPages: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${baseUrl}/author/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const tagIndex = buildTagIndex(reviews);
  const tagPages: MetadataRoute.Sitemap = tagIndex.map((t) => ({
    url: `${baseUrl}/tags/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  return [
    ...staticPages,
    ...reviewPages,
    ...viralPages,
    ...categoryPages,
    ...authorPages,
    ...tagPages,
  ];
}
