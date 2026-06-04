export const dynamic = 'force-dynamic';

import { MessageSquare, Star, ThumbsUp, Trash2 } from 'lucide-react';
import { getAllReviews } from '@/lib/db';
import DeleteCommentButton from '@/components/admin/DeleteCommentButton';

interface Comment {
  id: string;
  reviewId: string;
  reviewSlug: string;
  author: string;
  content: string;
  rating?: number;
  createdAt: string;
  likes: number;
}

async function getAllComments(): Promise<Comment[]> {
  try {
    const reviews = await getAllReviews();
    const allComments: Comment[] = [];

    for (const review of reviews) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/comments?reviewId=${review.id}&sort=newest`,
          { cache: 'no-store' }
        );
        const data = await res.json();
        if (data.comments) {
          allComments.push(...data.comments);
        }
      } catch {
        // Skip failed reviews
      }
    }

    return allComments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export default async function ComentariosPage() {
  const comments = await getAllComments();
  const reviews = await getAllReviews();

  const reviewMap = new Map(reviews.map(r => [r.id, r]));

  const totalComments = comments.length;
  const commentsWithRating = comments.filter(c => c.rating);
  const avgRating = commentsWithRating.length > 0
    ? (commentsWithRating.reduce((sum, c) => sum + (c.rating || 0), 0) / commentsWithRating.length).toFixed(1)
    : '—';
  const totalLikes = comments.reduce((sum, c) => sum + c.likes, 0);

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Comentários</h1>
        <p className="text-text-muted text-sm">Modere e gerencie os comentários dos leitores.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <MessageSquare size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{totalComments}</p>
          <p className="text-text-muted text-xs font-medium">Total de Comentários</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-yellow/20 text-yellow">
            <Star size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{avgRating}</p>
          <p className="text-text-muted text-xs font-medium">Nota Média</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-green-bg text-green">
            <ThumbsUp size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{totalLikes}</p>
          <p className="text-text-muted text-xs font-medium">Total de Likes</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-bg text-purple">
            <MessageSquare size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {commentsWithRating.length}
          </p>
          <p className="text-text-muted text-xs font-medium">Com Avaliação</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Todos os Comentários
          </p>
        </div>

        {comments.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Nenhum comentário ainda</p>
            <p className="text-xs mt-1">Os comentários dos leitores aparecerão aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {comments.map((comment) => {
              const review = reviewMap.get(comment.reviewId);
              return (
                <div key={comment.id} className="px-6 py-4 hover:bg-bg2 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center">
                        <span className="font-medium text-blue">
                          {comment.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-text">{comment.author}</p>
                        <p className="text-xs text-text-muted">
                          {new Date(comment.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {comment.rating && (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className="text-sm">
                              {star <= comment.rating! ? '⭐' : '☆'}
                            </span>
                          ))}
                        </div>
                      )}
                      <DeleteCommentButton commentId={comment.id} />
                    </div>
                  </div>

                  <p className="text-sm text-text-2 mb-2 ml-[52px]">{comment.content}</p>

                  <div className="flex items-center gap-4 ml-[52px]">
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <ThumbsUp size={12} />
                      {comment.likes} likes
                    </span>
                    {review && (
                      <a
                        href={`/admin/editar/${review.id}`}
                        className="text-xs text-blue hover:underline"
                      >
                        Review: {review.product}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
