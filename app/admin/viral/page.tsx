'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Zap, Search, Sparkles, Loader2, ArrowRight, CheckCircle2, 
  AlertTriangle, ShoppingBag, BarChart3, FileText, TrendingUp
} from 'lucide-react';

interface ViralArticle {
  meta: {
    title: string;
    description: string;
    keywords: string;
    reading_time: number;
  };
  hero: {
    headline_line1: string;
    headline_line2: string;
    headline_em: string;
    lead: string;
    overall_score: number;
    bars: { label: string; value: number; pct: number }[];
  };
  products: {
    name: string;
    score: number;
    price: string;
    old_price: string;
    affiliate_url: string;
    pros: string[];
    cons: string[];
    verdict: string;
  }[];
  compareTable: {
    caption: string;
    columns: string[];
    winnerCol: number;
    rows: string[][];
  };
  sections: {
    id: string;
    heading: string;
    toc_label: string;
    toc_emoji: string;
    content: string;
  }[];
  faq: { question: string; answer: string }[];
  verdict: {
    score: number;
    label: string;
    text: string;
    note: string;
  };
}

function ViralArticleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [products, setProducts] = useState<string[]>(
    searchParams.get('products')?.split(',') || ['', '', '']
  );
  const [articleType, setArticleType] = useState<'comparativo' | 'top5' | 'guia'>('comparativo');
  const [generating, setGenerating] = useState(false);
  const [article, setArticle] = useState<ViralArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');

  function addProduct() {
    if (products.length < 5) {
      setProducts([...products, '']);
    }
  }

  function removeProduct(index: number) {
    if (products.length > 2) {
      setProducts(products.filter((_, i) => i !== index));
    }
  }

  function updateProduct(index: number, value: string) {
    const newProducts = [...products];
    newProducts[index] = value;
    setProducts(newProducts);
  }

  async function handleGenerate() {
    if (!category.trim() || products.filter(p => p.trim()).length < 2) {
      setError('Preencha a categoria e pelo menos 2 produtos.');
      return;
    }

    setGenerating(true);
    setError(null);
    setArticle(null);

    try {
      const res = await fetch('/api/generate-viral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category.trim(),
          products: products.filter(p => p.trim()),
          type: articleType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar artigo.');
      }

      setArticle(data.data);
      setProvider(data.provider);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão.');
    } finally {
      setGenerating(false);
    }
  }

  function handleSaveDraft() {
    if (!article) return;
    
    const params = new URLSearchParams({
      viral: 'true',
      category: category,
      data: JSON.stringify(article),
    });
    
    router.push(`/admin/novo-review?${params.toString()}`);
  }

  return (
    <div className="p-8 flex-1 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1 flex items-center gap-3">
          <Zap className="text-yellow fill-yellow animate-pulse" size={36} />
          Artigo Viral Comparativo
        </h1>
        <p className="text-text-muted text-sm">
          Gere artigos no estilo Tecnoblog, MeuTop5 e Adrenaline com tabelas comparativas, FAQs e links de afiliado.
        </p>
      </div>

      {/* Article Type Selector */}
      <div className="flex gap-3 mb-6">
        {[
          { type: 'comparativo', label: 'Comparativo', icon: BarChart3, desc: 'A vs B vs C' },
          { type: 'top5', label: 'Top 5', icon: TrendingUp, desc: 'Ranking de produtos' },
          { type: 'guia', label: 'Guia de Compra', icon: FileText, desc: 'Como escolher' },
        ].map((t) => (
          <button
            key={t.type}
            onClick={() => setArticleType(t.type as any)}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
              articleType === t.type
                ? 'border-blue bg-blue/5 text-blue'
                : 'border-border bg-white text-text-muted hover:border-blue/30'
            }`}
          >
            <t.icon size={20} />
            <div className="text-left">
              <p className="font-syne font-bold text-sm">{t.label}</p>
              <p className="text-xs opacity-70">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label className="block text-xs font-syne font-bold uppercase tracking-widest text-text-muted mb-2">
              Categoria
            </label>
            <input
              type="text"
              placeholder="Ex: Wearables, Fones de Ouvido, Robôs Aspiradores"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={generating}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
            />
          </div>

          {/* Products */}
          <div>
            <label className="block text-xs font-syne font-bold uppercase tracking-widest text-text-muted mb-2">
              Produtos para Comparar (2-5)
            </label>
            <div className="space-y-2">
              {products.map((product, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Produto ${index + 1}`}
                    value={product}
                    onChange={(e) => updateProduct(index, e.target.value)}
                    disabled={generating}
                    className="flex-1 bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-text outline-none focus:border-blue transition-all"
                  />
                  {products.length > 2 && (
                    <button
                      onClick={() => removeProduct(index)}
                      className="px-3 py-2 text-red hover:bg-red/10 rounded-xl transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {products.length < 5 && (
                <button
                  onClick={addProduct}
                  className="text-xs text-blue hover:underline"
                >
                  + Adicionar produto
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating || !category.trim() || products.filter(p => p.trim()).length < 2}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-cta-gradient text-white font-syne font-bold text-sm uppercase tracking-wide shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all duration-200"
          >
            {generating ? (
              <>
                <Loader2 className="animate-spin" size={17} />
                Gerando Artigo Viral...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Gerar Artigo Comparativo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading */}
      {generating && (
        <div className="bg-white border border-border rounded-xl p-12 text-center shadow-sm">
          <Loader2 className="animate-spin text-blue mx-auto mb-4" size={48} />
          <h3 className="font-syne font-bold text-lg text-text">IA Gerando Artigo Viral...</h3>
          <p className="text-text-muted text-sm mt-1 max-w-md mx-auto">
            Criando tabelas comparativas, FAQs, schemas JSON-LD e otimizando para SEO e conversão.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red/5 border border-red/20 rounded-xl p-5 flex items-start gap-3 text-red mb-8">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="font-bold text-sm">Ocorreu um erro</h4>
            <p className="text-xs mt-1 text-red/80">{error}</p>
          </div>
        </div>
      )}

      {/* Article Preview */}
      {article && !generating && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            <p className="text-xs font-medium">
              <strong>Artigo gerado com sucesso!</strong> Provedor: {provider} | 
              Título: {article.meta.title}
            </p>
          </div>

          {/* Article Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bebas text-blue">{article.products?.length || 0}</p>
              <p className="text-xs text-text-muted">Produtos</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bebas text-blue">{article.compareTable?.rows?.length || 0}</p>
              <p className="text-xs text-text-muted">Especificações</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bebas text-blue">{article.faq?.length || 0}</p>
              <p className="text-xs text-text-muted">FAQs</p>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bebas text-blue">{article.meta.reading_time || 0}min</p>
              <p className="text-xs text-text-muted">Leitura</p>
            </div>
          </div>

          {/* Hero Preview */}
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="font-syne font-bold text-lg text-text mb-4">Preview do Hero</h2>
            <div className="bg-gradient-to-r from-blue/10 to-purple/10 rounded-xl p-6">
              <h3 className="font-bebas text-4xl tracking-wide text-text">{article.hero.headline_line1}</h3>
              <h4 className="font-bebas text-2xl text-blue">{article.hero.headline_line2}</h4>
              <p className="text-sm text-text-2 mt-4">{article.hero.lead}</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="font-bebas text-3xl text-blue">{article.hero.overall_score.toFixed(1)}</span>
                <span className="text-xs text-text-muted">/ 10</span>
              </div>
            </div>
          </div>

          {/* Comparison Table Preview */}
          <div className="bg-white border border-border rounded-xl p-6 overflow-x-auto">
            <h2 className="font-syne font-bold text-lg text-text mb-4">Tabela Comparativa</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg2">
                  {article.compareTable?.columns?.map((col: string, i: number) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-syne font-bold uppercase tracking-widest text-text-muted">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {article.compareTable?.rows?.slice(0, 5).map((row: string[], i: number) => (
                  <tr key={i} className="border-t border-border hover:bg-bg2 transition-colors">
                    {row.map((cell: string, j: number) => (
                      <td key={j} className={`px-4 py-3 ${j === 0 ? 'font-medium' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(article.compareTable?.rows?.length || 0) > 5 && (
              <p className="text-xs text-text-muted mt-2 text-center">
                + {article.compareTable.rows.length - 5} linhas adicionais
              </p>
            )}
          </div>

          {/* Products Preview */}
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="font-syne font-bold text-lg text-text mb-4">Produtos Comparados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {article.products?.map((product: any, i: number) => (
                <div key={i} className="bg-bg border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-syne font-bold text-sm text-text">{product.name}</h3>
                    <span className="font-bebas text-xl text-blue">{product.score.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-lg text-text">{product.price}</span>
                    {product.old_price && (
                      <span className="text-xs text-text-muted line-through">{product.old_price}</span>
                    )}
                  </div>
                  <div className="text-xs text-text-2">
                    <p className="font-bold text-green-600 mb-1">Prós:</p>
                    <ul className="list-disc list-inside space-y-0.5 mb-2">
                      {product.pros?.slice(0, 2).map((pro: string, j: number) => (
                        <li key={j}>{pro}</li>
                      ))}
                    </ul>
                    <p className="font-bold text-red-600 mb-1">Contras:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {product.cons?.slice(0, 2).map((con: string, j: number) => (
                        <li key={j}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ Preview */}
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="font-syne font-bold text-lg text-text mb-4">FAQ ({article.faq?.length || 0} perguntas)</h2>
            <div className="space-y-3">
              {article.faq?.slice(0, 3).map((item: any, i: number) => (
                <div key={i} className="bg-bg border border-border rounded-xl p-4">
                  <p className="font-syne font-bold text-sm text-text mb-2">{item.question}</p>
                  <p className="text-xs text-text-2">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setArticle(null)}
              className="px-6 py-3 rounded-xl border border-border text-text-muted hover:bg-bg2 transition-colors font-syne font-bold text-sm"
            >
              Gerar Novo
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue text-white font-syne font-bold text-sm hover:bg-blue/90 transition-colors shadow-blue"
            >
              <ShoppingBag size={17} />
              Criar Rascunho do Artigo
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ViralArticlePage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex-1 max-w-6xl">
        <div className="bg-white border border-border rounded-xl p-12 text-center shadow-sm">
          <Loader2 className="animate-spin text-blue mx-auto mb-4" size={48} />
          <h3 className="font-syne font-bold text-lg text-text">Carregando...</h3>
        </div>
      </div>
    }>
      <ViralArticleContent />
    </Suspense>
  );
}
