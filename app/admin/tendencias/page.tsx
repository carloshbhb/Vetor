'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Zap, Search, Sparkles, Loader2, ArrowRight, CheckCircle2, AlertTriangle, HelpCircle 
} from 'lucide-react';

interface TrendIdea {
  product: string;
  keywords: string[];
  difficulty: 'Baixa' | 'Média' | 'Alta';
  volume: 'Baixo' | 'Médio' | 'Alto';
  cpc: string;
  gapAnalysis: string;
}

export default function TrendsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'reviews' | 'viral'>('reviews');
  const [category, setCategory] = useState('');
  const [searching, setSearching] = useState(false);
  const [trends, setTrends] = useState<TrendIdea[] | null>(null);
  const [groundingActive, setGroundingActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim()) return;

    setSearching(true);
    setError(null);
    setTrends(null);

    try {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category.trim(), type: activeTab }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro desconhecido na pesquisa.');
      }

      setTrends(data.trends || []);
      setGroundingActive(!!data.groundingActive);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setSearching(false);
    }
  }

  function handleCreateDraft(idea: TrendIdea) {
    const params = new URLSearchParams({
      product: idea.product,
      category: category.trim(),
      keywords: idea.keywords.join(', '),
    });
    router.push(`/admin/novo-review?${params.toString()}`);
  }

  function handleCreateViral(idea: TrendIdea) {
    const params = new URLSearchParams({
      category: category.trim(),
      products: [idea.product, ...idea.keywords.slice(0, 2)].join(','),
    });
    router.push(`/admin/viral?${params.toString()}`);
  }

  return (
    <div className="p-8 flex-1 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-bebas text-5xl tracking-wide text-text mb-1 flex items-center gap-3">
          <Zap className="text-yellow fill-yellow animate-pulse" size={36} />
          IA Tendências de SEO
        </h1>
        <p className="text-text-muted text-sm">
          Descubra quais produtos, palavras-chave e pautas de reviews estão quentes e fáceis de ranquear usando a inteligência do Google Search Grounding.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 mb-6 border-b border-border pb-px">
        <button
          onClick={() => { setActiveTab('reviews'); setTrends(null); }}
          className={`px-5 py-2.5 font-syne font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'reviews'
              ? 'border-blue text-blue font-bold'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          📝 Reviews de Produtos
        </button>
        <button
          onClick={() => { setActiveTab('viral'); setTrends(null); }}
          className={`px-5 py-2.5 font-syne font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'viral'
              ? 'border-blue text-blue font-bold'
              : 'border-transparent text-text-muted hover:text-text'
          }`}
        >
          🔥 Tráfego Viral (Guias & Comparativos)
        </button>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-border rounded-xl shadow-sm p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              placeholder={
                activeTab === 'viral'
                  ? "Digite a categoria para gerar pautas comparativas/listas (Ex: Smartwatches, Fones de Ouvido, Casa Inteligente)..."
                  : "Digite o nicho ou categoria para reviews (Ex: Wearables, Smartwatches, Fones Bluetooth, Robôs Aspiradores)..."
              }
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={searching}
              className="w-full bg-bg border border-border rounded-xl pl-12 pr-4 py-3 text-sm text-text outline-none focus:border-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,.1)] transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !category.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cta-gradient text-white font-syne font-bold text-sm uppercase tracking-wide shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all duration-200"
          >
            {searching ? (
              <>
                <Loader2 className="animate-spin" size={17} />
                Pesquisando...
              </>
            ) : (
              <>
                <Sparkles size={17} />
                Pesquisar Tendências
              </>
            )}
          </button>
        </form>
      </div>

      {/* Loading Overlay */}
      {searching && (
        <div className="bg-white border border-border rounded-xl p-12 text-center shadow-sm">
          <Loader2 className="animate-spin text-blue mx-auto mb-4" size={48} />
          <h3 className="font-syne font-bold text-lg text-text">Agente de IA Pesquisando...</h3>
          <p className="text-text-muted text-sm mt-1 max-w-md mx-auto">
            O agente está realizando varreduras de mercado e avaliando a concorrência no Google para extrair as melhores brechas de SEO. Isso pode levar até 15 segundos.
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red/5 border border-red/20 rounded-xl p-5 flex items-start gap-3 text-red mb-8">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="font-bold text-sm">Ocorreu um erro</h4>
            <p className="text-xs mt-1 text-red/80">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {trends && !searching && (
        <div className="space-y-6">
          
          {/* Grounding Mode Status Card */}
          {groundingActive ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
              <p className="text-xs font-medium">
                <strong>Google Search Grounding ATIVO:</strong> A IA realizou buscas em tempo real na internet (2026) e os dados de concorrência e tendências abaixo estão 100% atualizados de acordo com as pesquisas do Google.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-xs font-semibold">
                  Modo de Estimativa de IA (Grounding Inativo)
                </p>
                <p className="text-[11px] text-amber-800/80 mt-1 leading-relaxed">
                  Para habilitar buscas em tempo real e análise concorrencial atualizada, ative o faturamento (billing) no console do seu <strong>Google AI Studio</strong>. 
                  Abaixo, exibimos estimativas avançadas simuladas pela base de conhecimento robusta do Gemini 3.5 Flash para a categoria desejada.
                </p>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trends.map((idea, index) => (
              <div 
                key={index} 
                className="bg-white border border-border rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with product & badges */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-bebas text-3xl tracking-wide text-text leading-tight max-w-[70%]">
                      {idea.product}
                    </h3>
                    <div className="flex flex-col gap-1.5 items-end">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border
                        ${idea.difficulty === 'Baixa'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : idea.difficulty === 'Média'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        Dif: {idea.difficulty}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        Vol: {idea.volume}
                      </span>
                    </div>
                  </div>

                  {/* CPC Estimate */}
                  <p className="text-xs text-text-muted mb-4 flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-text-muted/60" />
                    Valor Comercial (CPC): <strong className="text-text font-semibold">{idea.cpc}</strong>
                  </p>

                  {/* Keywords */}
                  <div className="mb-4">
                    <p className="text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted mb-2">
                      Palavras-chave recomendadas
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {idea.keywords.map((kw, i) => (
                        <span key={i} className="bg-bg border border-border text-xs px-2.5 py-1 rounded-lg text-text-2 font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Gap Analysis */}
                  <div className="bg-bg border border-border rounded-xl p-4 mb-6">
                    <p className="text-[11px] font-syne font-bold uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
                      💡 {activeTab === 'viral' ? 'Análise Concorrencial da Pauta' : 'Análise de Brecha Concorrente'}
                    </p>
                    <p className="text-xs text-text-2 leading-relaxed">
                      {idea.gapAnalysis}
                    </p>
                  </div>
                </div>

                {/* Generate draft button */}
                <button
                  onClick={() => activeTab === 'viral' ? handleCreateViral(idea) : handleCreateDraft(idea)}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-light hover:bg-blue border border-blue-mid text-blue hover:text-white font-syne font-bold text-xs uppercase tracking-wider transition-colors duration-200 mt-2"
                >
                  {activeTab === 'viral' ? 'Criar Artigo Comparativo' : 'Criar Rascunho do Review'}
                  <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {trends?.length === 0 && !searching && (
        <div className="bg-white border border-border rounded-xl p-12 text-center shadow-sm">
          <p className="font-syne font-bold text-sm text-text-muted">Nenhuma tendência encontrada</p>
          <p className="text-xs text-text-muted mt-1">Tente pesquisar com outro nicho ou categoria.</p>
        </div>
      )}
    </div>
  );
}
