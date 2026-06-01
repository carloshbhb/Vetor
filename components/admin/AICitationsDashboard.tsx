// ─────────────────────────────────────────────────────────────────────────────
// Vetor Blog — AI Citations Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import { useState, useEffect } from 'react';

interface CitationStats {
  totalCitations: number;
  bySource: Record<string, number>;
  topCitedPages: { page: string; count: number }[];
  lastDetected: string;
}

interface Citation {
  id: string;
  source: string;
  query: string;
  citedUrl: string;
  citedPage: string;
  context: string;
  detectedAt: string;
  verified: boolean;
}

const sourceLabels: Record<string, string> = {
  'chatgpt': 'ChatGPT',
  'perplexity': 'Perplexity',
  'google-ai-overview': 'Google AI Overview',
  'claude': 'Claude',
  'copilot': 'Copilot',
  'brave-search': 'Brave Search AI',
};

const sourceColors: Record<string, string> = {
  'chatgpt': 'bg-green-100 text-green-800',
  'perplexity': 'bg-blue-100 text-blue-800',
  'google-ai-overview': 'bg-yellow-100 text-yellow-800',
  'claude': 'bg-purple-100 text-purple-800',
  'copilot': 'bg-cyan-100 text-cyan-800',
  'brave-search': 'bg-orange-100 text-orange-800',
};

export default function AICitationsDashboard() {
  const [stats, setStats] = useState<CitationStats | null>(null);
  const [recent, setRecent] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai-citations')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats);
        setRecent(data.recent);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-8 text-text-muted">Carregando dados de citações...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8 text-text-muted">Erro ao carregar dados.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-syne font-bold text-xl text-text">Monitor de Citações em IA</h2>
        <span className="text-xs text-text-muted">
          Última detecção: {new Date(stats.lastDetected).toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-border">
          <p className="text-xs text-text-muted uppercase tracking-wider">Total de Citações</p>
          <p className="font-bebas text-3xl text-blue mt-1">{stats.totalCitations}</p>
        </div>
        {Object.entries(stats.bySource).slice(0, 3).map(([source, count]) => (
          <div key={source} className="bg-white rounded-xl p-4 border border-border">
            <p className="text-xs text-text-muted uppercase tracking-wider">{sourceLabels[source] || source}</p>
            <p className="font-bebas text-3xl text-text mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Top Cited Pages */}
      {stats.topCitedPages.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-border">
          <h3 className="font-syne font-bold text-sm text-text mb-4">Páginas Mais Citadas</h3>
          <div className="space-y-2">
            {stats.topCitedPages.map((page, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-text truncate mr-4">{page.page}</span>
                <span className="font-medium text-blue">{page.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Citations */}
      {recent.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-border">
          <h3 className="font-syne font-bold text-sm text-text mb-4">Citações Recentes</h3>
          <div className="space-y-3">
            {recent.map(c => (
              <div key={c.id} className="p-3 bg-bg2 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sourceColors[c.source] || 'bg-gray-100 text-gray-800'}`}>
                    {sourceLabels[c.source] || c.source}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(c.detectedAt).toLocaleDateString('pt-BR')}
                  </span>
                  {c.verified && (
                    <span className="text-xs text-green-600">✓ Verificado</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mb-1">Consulta: "{c.query}"</p>
                {c.context && (
                  <p className="text-sm text-text italic">"{c.context}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.totalCitations === 0 && (
        <div className="bg-white rounded-xl p-8 border border-border text-center">
          <p className="text-text-muted mb-2">Nenhuma citação detectada ainda.</p>
          <p className="text-xs text-text-muted">
            Use ferramentas como <strong>Otterly.ai</strong> ou <strong>Rankbox</strong> para monitorar citações em IAs.
          </p>
        </div>
      )}
    </div>
  );
}
