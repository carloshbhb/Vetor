'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: string;
  author: string;
  content: string;
  rating?: number;
  createdAt: string;
  likes: number;
  replies?: Comment[];
}

interface CommentsSectionProps {
  reviewId: string;
  reviewSlug: string;
}

export default function CommentsSection({ reviewId, reviewSlug }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');

  // Load comments
  useEffect(() => {
    loadComments();
  }, [reviewId, sortBy]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/comments?reviewId=${reviewId}&sort=${sortBy}`);
      const data = await response.json();
      if (data.comments) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          reviewSlug,
          author: authorName,
          content: newComment,
          rating: rating > 0 ? rating : undefined,
        }),
      });

      if (response.ok) {
        setNewComment('');
        setRating(0);
        loadComments();
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}/like`, { method: 'POST' });
      loadComments();
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  return (
    <div className="mt-10 border-t border-border pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-syne font-bold text-xl text-text">
          Comentários & Avaliações
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="popular">Mais populares</option>
          </select>
        </div>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-bg2 rounded-xl border border-border">
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Seu nome
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Digite seu nome"
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Avaliação (opcional)
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star === rating ? 0 : star)}
                className="text-2xl transition-colors"
              >
                {star <= rating ? '⭐' : '☆'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Comentário
          </label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Compartilhe sua experiência com o produto..."
            rows={4}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim() || !authorName.trim()}
          className="px-6 py-2 bg-blue text-white rounded-lg hover:bg-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Comentário'}
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 bg-white rounded-xl border border-border"
            >
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
                      {new Date(comment.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {comment.rating && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-sm">
                        {star <= comment.rating! ? '⭐' : '☆'}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-text-2 mb-3">{comment.content}</p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(comment.id)}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-blue transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                  </svg>
                  {comment.likes > 0 && <span>{comment.likes}</span>}
                </button>
                <button className="text-sm text-text-muted hover:text-blue transition-colors">
                  Responder
                </button>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-border space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="p-3 bg-bg2 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue">
                            {reply.author.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-sm text-text">{reply.author}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(reply.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-text-2">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* UGC Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: `Review - ${reviewSlug}`,
            review: comments
              .filter((c) => c.rating)
              .map((c) => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: c.author },
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: c.rating,
                  bestRating: 5,
                },
                reviewBody: c.content,
                datePublished: c.createdAt,
              })),
            aggregateRating: comments.filter((c) => c.rating).length > 0
              ? {
                  '@type': 'AggregateRating',
                  ratingValue:
                    comments.reduce((sum, c) => sum + (c.rating || 0), 0) /
                    comments.filter((c) => c.rating).length,
                  reviewCount: comments.filter((c) => c.rating).length,
                }
              : undefined,
          }),
        }}
      />
    </div>
  );
}