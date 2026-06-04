export const dynamic = 'force-dynamic';

import { Brain, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { getMarketInsights, getPriceTrends, getScoreDistribution } from '@/lib/research';

export default async function ResearchPage() {
  const [insights, priceTrends, scoreDistribution] = await Promise.all([
    getMarketInsights(),
    getPriceTrends(),
    getScoreDistribution(),
  ]);

  const totalReviews = insights.reduce((sum, i) => sum + i.totalReviews, 0);
  const avgScore = insights.length > 0
    ? (insights.reduce((sum, i) => sum + i.avgScore, 0) / insights.length).toFixed(1)
    : '—';
  const topDiscount = priceTrends.length > 0 ? priceTrends[0] : null;

  return (
    <div className="p-8 flex-1">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1">Research & GEO</h1>
        <p className="text-text-muted text-sm">Dados proprietários do Vetor Blog expostos a motores de IA.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-blue-light text-blue">
            <Brain size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{insights.length}</p>
          <p className="text-text-muted text-xs font-medium">Categorias Analisadas</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-green-bg text-green">
            <TrendingUp size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{totalReviews}</p>
          <p className="text-text-muted text-xs font-medium">Total de Reviews</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-yellow/20 text-yellow">
            <BarChart3 size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">{avgScore}</p>
          <p className="text-text-muted text-xs font-medium">Nota Média Geral</p>
        </div>
        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-purple-bg text-purple">
            <DollarSign size={18} />
          </div>
          <p className="font-bebas text-4xl text-text leading-none mb-1">
            {topDiscount ? `${topDiscount.discountPct}%` : '—'}
          </p>
          <p className="text-text-muted text-xs font-medium">Maior Desconto</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
              Insights por Categoria
            </p>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {insights.map((insight) => (
              <div key={insight.category} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-syne font-bold text-sm text-text">{insight.category}</h3>
                  <span className="bg-blue-light border border-blue-mid rounded-lg text-xs font-syne font-bold px-2.5 py-1 text-blue">
                    {insight.avgScore}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-text-muted mb-2">
                  <span>Reviews: {insight.totalReviews}</span>
                  <span>Preço médio: {insight.priceRange.avg}</span>
                </div>
                {insight.commonPros.length > 0 && (
                  <div className="mb-1">
                    <span className="text-[10px] font-bold text-green uppercase">Prós:</span>
                    <p className="text-xs text-text-muted">{insight.commonPros.join(', ')}</p>
                  </div>
                )}
                {insight.commonCons.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-red-500 uppercase">Contras:</span>
                    <p className="text-xs text-text-muted">{insight.commonCons.join(', ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
              Distribuição de Notas
            </p>
          </div>
          <div className="p-6">
            {scoreDistribution.map((dist) => (
              <div key={dist.range} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-text">{dist.range}</span>
                  <span className="text-xs text-text-muted">{dist.count} reviews ({dist.percentage}%)</span>
                </div>
                <div className="w-full bg-bg2 rounded-full h-2">
                  <div
                    className="bg-blue rounded-full h-2 transition-all"
                    style={{ width: `${dist.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="font-syne font-bold text-xs uppercase tracking-widest text-text">
            Tendências de Preço
          </p>
        </div>
        {priceTrends.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-syne font-bold text-sm">Sem dados de preço</p>
            <p className="text-xs mt-1">Adicione preços aos reviews para ver as tendências.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-bg2">
                {['Produto', 'Categoria', 'Preço Anterior', 'Preço Atual', 'Desconto'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priceTrends.slice(0, 10).map((trend) => (
                <tr key={trend.slug} className="border-b border-border last:border-0 hover:bg-bg2 transition-colors">
                  <td className="px-4 py-3">
                    <a href={`/review/${trend.slug}`} target="_blank" className="font-semibold text-sm text-blue hover:underline">
                      {trend.product}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-bg2 border border-border rounded-full text-xs font-medium px-2.5 py-0.5 text-text-muted">
                      {trend.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted line-through">{trend.oldPrice}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green">{trend.currentPrice}</td>
                  <td className="px-4 py-3">
                    <span className="bg-green-bg text-green text-xs font-bold px-2 py-0.5 rounded-full">
                      -{trend.discountPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
