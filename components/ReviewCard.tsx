'use client';

import Link from 'next/link';
import { Trash2, ExternalLink, Calendar } from 'lucide-react';
import { useTransition } from 'react';

export default function ReviewCard({ review, onDelete }: { review: any, onDelete: (id: string) => void }) {
  const [isPending, startTransition] = useTransition();

  let data = null;
  try {
    data = JSON.parse(review.json_data);
  } catch (_e) {
    // empty
  }

  const score = data?.hero?.score || 'N/A';
  const date = new Date(review.created_at).toLocaleDateString('pt-BR');

  return (
    <div className="review-card">
      <div className="review-card-header">
        <h3 className="review-title">{review.title}</h3>
        <div className="review-score">{score}</div>
      </div>
      <div className="review-card-body">
        <p className="review-product"><strong>Produto:</strong> {review.product_name}</p>
        <div className="review-meta">
          <span className="review-date"><Calendar size={14} /> {date}</span>
        </div>
      </div>
      <div className="review-card-actions">
        <Link href={`/review/${review.id}`} className="btn btn-outline btn-sm">
          <ExternalLink size={16} /> Ver / Exportar
        </Link>
        <button 
          onClick={() => startTransition(() => onDelete(review.id))} 
          disabled={isPending}
          className="btn btn-danger btn-sm"
          title="Deletar Review"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
