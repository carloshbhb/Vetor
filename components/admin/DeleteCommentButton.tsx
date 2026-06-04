'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteCommentButtonProps {
  commentId: string;
}

export default function DeleteCommentButton({ commentId }: DeleteCommentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleted(true);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (deleted) {
    return (
      <span className="text-xs text-text-muted italic">Excluído</span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      title="Excluir comentário"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}
