import { MetadataRoute } from 'next';
import { getPublishedReviews } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
  const reviews = await getPublishedReviews();

  const reviewUrls = reviews.map(review => ({
    url: `${baseUrl}/review/${review.slug}`,
    lastModified: new Date(review.updatedAt || review.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...reviewUrls,
  ];
}
