'use client';

import { useState } from 'react';
import { Globe, Loader2, Send } from 'lucide-react';

interface Review {
  id: string;
  slug: string;
  product: string;
}

interface IndexingActionsProps {
  reviews: Review[];
  hasCredentials: boolean;
  single?: boolean;
}

export default function IndexingActions({ reviews, hasCredentials, single }: IndexingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const indexUrl = async (url: string) => {
    if (!hasCredentials) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/google-indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'url' }),
      });
      const data = await res.json();
      setResult(data.success ? 'Indexado!' : 'Erro ao indexar');
    } catch {
      setResult('Erro de conexão');
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const indexReview = async (slug: string) => {
    if (!hasCredentials) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/google-indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, action: 'review' }),
      });
      const data = await res.json();
      setResult(data.success ? 'Indexado!' : 'Erro ao indexar');
    } catch {
      setResult('Erro de conexão');
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const indexAll = async () => {
    if (!hasCredentials) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/google-indexing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all' }),
      });
      const data = await res.json();
      setResult(data.success ? `${data.indexed || 0} páginas indexadas!` : 'Erro ao indexar');
    } catch {
      setResult('Erro de conexão');
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  if (single && reviews.length === 1) {
    return (
      <button
        onClick={() => indexReview(reviews[0].slug)}
        disabled={!hasCredentials || loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-2 hover:bg-bg2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {result || 'Indexar'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={indexAll}
        disabled={!hasCredentials || loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-light border border-blue-mid text-xs font-medium text-blue hover:bg-blue hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
        {result || 'Indexar Todas as Páginas'}
      </button>
    </div>
  );
}
