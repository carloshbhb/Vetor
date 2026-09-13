import type { Metadata } from 'next';
import { fetchReviewBySlug } from '@/lib/data';

export default async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const review = await fetchReviewBySlug(slug);
  if (!review) return { title: 'Review não encontrado' };

  return {
    title: review.meta_title || review.product,
    description: review.meta_description || review.hero_lead,
    openGraph: {
      title: review.meta_title || review.product,
      description: review.meta_description || review.hero_lead,
      type: 'article',
      url: `https://vetor.blog/reviews/${review.slug}`,
      images: review.image_url
        ? [{ url: review.image_url, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: review.meta_title || review.product,
      description: review.meta_description || review.hero_lead,
    },
    alternates: {
      canonical: `https://vetor.blog/reviews/${review.slug}`,
    },
  };
}
