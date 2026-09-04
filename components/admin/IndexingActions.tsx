'use client';

import { useState } from 'react';
import { Globe, Loader2, Send, Zap } from 'lucide-react';

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
      setResult(data.success ? 'Indexado no Google!' : 'Erro ao indexar');
    } catch {
      setResult('Erro de conexão');
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const indexViaIndexNow = async (url: string) => {
    try {
      const res = await fetch('/api/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: [url] }),
      });
      const data = await res.json();
      setResult(prev => prev ? `${prev} | Bing IndexNow ✓` : 'Indexado no Bing!');
    } catch {
      setResult(prev => prev ? prev : 'Erro no IndexNow');
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

  const indexAllViaIndexNow = async () => {
    if (!hasCredentials) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all' }),
      });
      const data = await res.json();
      setResult(data.success ? `${data.success} páginas notificadas no Bing!` : 'Erro no IndexNow');
    } catch {
      setResult('Erro de conexão');
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  if (single && reviews.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => indexUrl(`https://vetor.blog/review/${reviews[0].slug}`)}
          disabled={!hasCredentials || loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-2 hover:bg-bg2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Google
        </button>
        <button
          onClick={() => indexViaIndexNow(`https://vetor.blog/review/${reviews[0].slug}`)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 text-xs font-medium text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap size={14} />
          Bing
        </button>
      </div>
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
        Google
      </button>
      <button
        onClick={indexAllViaIndexNow}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-light border border-green-mid text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Zap size={14} />
        Bing
      </button>
    </div>
  );
}
