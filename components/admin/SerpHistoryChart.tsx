'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SerpHistoryChartProps {
  reviews: Array<{
    id: string;
    product: string;
    slug: string;
    googleRank?: number | null;
    lastRankCheck?: string;
    updatedAt: string;
  }>;
}

export default function SerpHistoryChart({ reviews }: SerpHistoryChartProps) {
  const rankedReviews = reviews
    .filter(r => r.status === 'published' && r.googleRank && r.googleRank > 0)
    .sort((a, b) => (a.googleRank || 999) - (b.googleRank || 999))
    .slice(0, 10);

  const getRankChange = (current: number | null, previous: number | null) => {
    if (!previous || !current) return 'stable';
    if (current < previous) return 'up';
    if (current > previous) return 'down';
    return 'stable';
  };

  const getRankIcon = (change: string) => {
    switch (change) {
      case 'up': return <TrendingUp size={14} className="text-green" />;
      case 'down': return <TrendingDown size={14} className="text-red-500" />;
      default: return <Minus size={14} className="text-text-muted" />;
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 3) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (rank <= 10) return 'bg-teal-50 border-teal-200 text-teal-700';
    return 'bg-slate-50 border-slate-200 text-slate-700';
  };

  return (
    <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
          Rankings Google (SERP)
        </p>
      </div>

      {rankedReviews.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-syne font-bold text-sm">Nenhum ranking encontrado</p>
          <p className="text-xs mt-1">Execute o rastreador SERP para ver os rankings.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {rankedReviews.map((review) => {
            const change = getRankChange(review.googleRank || null, null);
            return (
              <div key={review.id} className="px-6 py-3 flex items-center justify-between hover:bg-bg2 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${getRankColor(review.googleRank || 999)}`}>
                    #{review.googleRank}
                  </span>
                  <div>
                    <p className="font-medium text-sm text-text">{review.product}</p>
                    <p className="text-xs text-text-muted">/review/{review.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRankIcon(change)}
                  <span className="text-xs text-text-muted">
                    {review.lastRankCheck
                      ? new Date(review.lastRankCheck).toLocaleDateString('pt-BR')
                      : new Date(review.updatedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
