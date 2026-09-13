import type { MetadataRoute } from 'next';
import { fetchAllReviews, fetchAllViralArticles } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, viralArticles] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://vetor.blog',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://vetor.blog/reviews',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://vetor.blog/comparativos',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const reviewPages: MetadataRoute.Sitemap = reviews.map((r) => ({
    url: `https://vetor.blog/reviews/${r.slug}`,
    lastModified: new Date(r.updated_at || r.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const viralPages: MetadataRoute.Sitemap = viralArticles.map((a) => ({
    url: `https://vetor.blog/comparativos/${a.slug}`,
    lastModified: new Date(a.updated_at || a.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...reviewPages, ...viralPages];
}
