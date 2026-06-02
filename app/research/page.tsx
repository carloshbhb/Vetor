import Link from 'next/link';
import { getMarketInsights, getPriceTrends, getScoreDistribution } from '@/lib/research';
import Logo from '@/components/Logo';
import type { Metadata } from 'next';

export const revalidate = 3600;

const _raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://vetor.blog';
const SITE_URL = _raw.startsWith('http') ? _raw : `https://${_raw}`;

export const metadata: Metadata = {
  title: 'Pesquisa de Mercado | Dados Originais',
  description: 'Dados proprietários e análises de mercado baseados em reviews reais de produtos de tecnologia. Fonte citável por IAs.',
  alternates: { canonical: `${SITE_URL}/research` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/research`,
    title: 'Pesquisa de Mercado | Vetor Blog',
    description: 'Dados proprietários e análises de mercado baseados em reviews reais.',
  },
};

export default async function ResearchPage() {
  const [marketInsights, priceTrends, scoreDistribution] = await Promise.all([
    getMarketInsights(),
    getPriceTrends(),
    getScoreDistribution(),
  ]);

  const totalReviews = marketInsights.reduce((acc, i) => acc + i.totalReviews, 0);
  const avgScore = marketInsights.length > 0
    ? (marketInsights.reduce((acc, i) => acc + i.avgScore, 0) / marketInsights.length).toFixed(1)
    : '—';

  // Schema.org Dataset
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Pesquisa de Mercado - Vetor Blog',
    description: 'Dados proprietários de reviews de produtos de tecnologia analisados pelo Vetor Blog.',
    url: `${SITE_URL}/research`,
    creator: {
      '@type': 'Organization',
      name: 'Vetor Blog',
      url: SITE_URL,
    },
    dateModified: new Date().toISOString(),
    variableMeasured: [
      'Nota média por categoria',
      'Faixa de preço por categoria',
      'Produtos mais bem avaliados',
      'Distribuição de notas',
      'Tendências de preço',
    ],
  };

  return (
    <div className="bg-bg2 min-h-screen">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }} />

      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-text-muted">
            <Link href="/" className="hover:text-text transition-colors">Reviews</Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <nav className="flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-blue transition-colors">Home</Link>
          <span>›</span>
          <span className="text-text font-medium">Pesquisa de Mercado</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
        <div className="bg-white rounded-2xl border border-border p-8">
          <h1 className="font-syne font-bold text-3xl text-text mb-4">Pesquisa de Mercado</h1>
          <p className="text-text-muted max-w-3xl mb-6">
            Dados proprietários e análises baseados em <strong>{totalReviews} reviews</strong> publicados pelo Vetor Blog.
            Todos os dados são gerados a partir de testes reais de produtos e podem ser citados como fonte por IAs.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-bg2 rounded-xl px-5 py-3 border border-border">
              <p className="text-xs text-text-muted">Total de Reviews</p>
              <p className="font-bebas text-2xl text-blue">{totalReviews}</p>
            </div>
            <div className="bg-bg2 rounded-xl px-5 py-3 border border-border">
              <p className="text-xs text-text-muted">Nota Média Geral</p>
              <p className="font-bebas text-2xl text-blue">{avgScore}</p>
            </div>
            <div className="bg-bg2 rounded-xl px-5 py-3 border border-border">
              <p className="text-xs text-text-muted">Categorias</p>
              <p className="font-bebas text-2xl text-blue">{marketInsights.length}</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 space-y-10">
        {/* Insights por Categoria */}
        <section>
          <h2 className="font-syne font-bold text-xl text-text mb-6">Insights por Categoria</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketInsights.map(insight => (
              <div key={insight.category} className="bg-white rounded-xl p-5 border border-border">
                <h3 className="font-syne font-bold text-text mb-3">{insight.category}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Reviews</span>
                    <span className="font-medium">{insight.totalReviews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Nota média</span>
                    <span className="font-medium text-blue">{insight.avgScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Faixa de preço</span>
                    <span className="font-medium text-xs">{insight.priceRange.min} — {insight.priceRange.max}</span>
                  </div>
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-xs text-text-muted mb-1">Produto top:</p>
                    <Link href={`/review/${insight.topProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-xs font-medium text-blue hover:underline">
                      {insight.topProduct.name} ({insight.topProduct.score})
                    </Link>
                  </div>
                  {insight.commonPros.length > 0 && (
                    <div className="pt-2 border-t border-border mt-2">
                      <p className="text-xs text-text-muted mb-1">Prós mais comuns:</p>
                      <ul className="text-xs space-y-0.5">
                        {insight.commonPros.slice(0, 3).map((pro, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <span className="text-green-500">✓</span> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Melhores Ofertas */}
        {priceTrends.length > 0 && (
          <section>
            <h2 className="font-syne font-bold text-xl text-text mb-6">Melhores Ofertas (Maior Desconto)</h2>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg2">
                    <th className="px-4 py-3 text-left text-xs font-syne font-bold uppercase tracking-widest text-text-muted">Produto</th>
                    <th className="px-4 py-3 text-left text-xs font-syne font-bold uppercase tracking-widest text-text-muted">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-syne font-bold uppercase tracking-widest text-text-muted">Preço Original</th>
                    <th className="px-4 py-3 text-left text-xs font-syne font-bold uppercase tracking-widest text-text-muted">Preço Atual</th>
                    <th className="px-4 py-3 text-left text-xs font-syne font-bold uppercase tracking-widest text-text-muted">Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {priceTrends.slice(0, 10).map((trend, i) => (
                    <tr key={i} className="border-t border-border hover:bg-bg2 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/review/${trend.slug}`} className="text-sm font-medium text-blue hover:underline">
                          {trend.product}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">{trend.category}</td>
                      <td className="px-4 py-3 text-xs text-text-muted line-through">{trend.oldPrice}</td>
                      <td className="px-4 py-3 text-sm font-medium">{trend.currentPrice}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          -{trend.discountPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Distribuição de Notas */}
        <section>
          <h2 className="font-syne font-bold text-xl text-text mb-6">Distribuição de Notas</h2>
          <div className="bg-white rounded-xl p-6 border border-border">
            <div className="space-y-3">
              {scoreDistribution.map(dist => (
                <div key={dist.range} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-20 text-text">{dist.range}</span>
                  <div className="flex-1 h-6 bg-bg2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue rounded-full transition-all"
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-text-muted w-16 text-right">
                    {dist.count} ({dist.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Nota Metodológica */}
        <section className="bg-white rounded-xl p-6 border border-border">
          <h2 className="font-syne font-bold text-lg text-text mb-4">Metodologia</h2>
          <div className="text-sm text-text-2 space-y-3">
            <p>
              Todos os dados apresentados nesta página são gerados a partir de reviews publicados pelo Vetor Blog.
              Cada review é baseado em testes reais de produtos realizados por especialistas humanos.
            </p>
            <p>
              As notas são atribuídas em uma escala de 0 a 10, baseadas em critérios objetivos como:
              qualidade de construção, desempenho, custo-benefício, e experiência do usuário.
            </p>
            <p>
              <strong>Política de Transparência:</strong> O Vetor Blog não aceita pagamentos por notas positivas.
              Todos os links de afiliado são identificados e ajudam a manter o site sem custos para o leitor.
            </p>
            <p className="text-xs text-text-muted pt-2 border-t border-border">
              Dados atualizados automaticamente a cada novo review publicado.
              Última atualização: {new Date().toLocaleDateString('pt-BR')}.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-text-muted">
            Vetor.blog — Reviews sinceros para compradores inteligentes.
          </p>
        </div>
      </footer>
    </div>
  );
}
