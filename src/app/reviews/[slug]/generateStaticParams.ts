import { fetchAllReviews } from '@/lib/data';

export default async function generateStaticParams() {
  const reviews = await fetchAllReviews();
  return reviews.map((review) => ({ slug: review.slug }));
}
