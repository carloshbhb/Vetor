// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — Market Insights Component (Dados Citáveis)
// ─────────────────────────────────────────────────────────────────────────────

interface MarketInsight {
  category: string;
  totalReviews: number;
  avgScore: number;
  priceRange: { min: string; max: string; avg: string };
  topProduct: { name: string; score: number };
}

interface MarketInsightsProps {
  insights: MarketInsight[];
}

export default function MarketInsights({ insights }: MarketInsightsProps) {
  if (insights.length === 0) return null;

  return (
    <section className="mb-12 bg-bg2 rounded-2xl p-6 border border-border">
      <h2 className="font-syne font-bold text-xl text-text mb-2">Dados de Mercado (Pesquisa Original)</h2>
      <p className="text-xs text-text-muted mb-6">
        Análise baseada em {insights.reduce((a, i) => a + i.totalReviews, 0)} reviews publicados pelo Vetor Blog.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map(insight => (
          <div key={insight.category} className="bg-white rounded-xl p-4 border border-border">
            <h3 className="font-syne font-bold text-sm text-text mb-3">{insight.category}</h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-text-muted">Reviews analisados</span>
                <span className="font-medium text-text">{insight.totalReviews}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Nota média</span>
                <span className="font-medium text-blue">{insight.avgScore.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Faixa de preço</span>
                <span className="font-medium text-text">{insight.priceRange.min} — {insight.priceRange.max}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-text-muted">Produto top</span>
                <span className="font-medium text-green-600">{insight.topProduct.name} ({insight.topProduct.score})</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
