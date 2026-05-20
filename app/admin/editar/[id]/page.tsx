import { getReviewById } from '@/lib/db';
import ReviewForm from '@/components/admin/ReviewForm';
import { notFound } from 'next/navigation';

export default function EditarReviewPage({ params }: { params: { id: string } }) {
  const review = getReviewById(params.id);
  if (!review) notFound();

  return (
    <div className="p-8 flex-1 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Editar Review</h1>
        <p className="text-text-muted text-sm truncate max-w-xl">{review.meta.title}</p>
      </div>
      <ReviewForm initial={review} reviewId={review.id} />
    </div>
  );
}
