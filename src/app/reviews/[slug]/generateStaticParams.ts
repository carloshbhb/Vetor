import { fetchAllReviewSummaries } from '@/lib/public-data';

export default async function generateStaticParams() {
  const reviews = await fetchAllReviewSummaries();
  return reviews.map((review) => ({ slug: review.slug }));
}
