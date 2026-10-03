"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  generatedAt: string;
  period: { startDate: string; endDate: string };
  searchConsole: { configured: boolean; error: string | null; rows: number };
  inventory: { publishedReviews: number; comparisons: number; buyingGuides: number; buyingIntentPages: number };
  queryOpportunities: Array<{ query: string; page: string; impressions: number; clicks: number; ctr: number; position: number; action: string }>;
  pages: Array<{ page: string; impressions: number; clicks: number; avgPosition: number }>;
  contentOpportunities: {
    thinCategories: Array<{ category: string; slug: string; reviews: number; action: string }>;
    missingIntent: Array<{ category: string; slug: string; reviews: number; action: string }>;
  };
};

export default function OpportunitiesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/opportunities", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o dashboard.");
        return response.json();
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar."));
  }, []);

  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm">{error}</div>;
  if (!data) return <div className="py-20 text-center text-[var(--muted)]">Analisando oportunidades...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--amber)] font-bold">Fase 4.4</p>
          <h1 className="font-display text-3xl mt-1">Oportunidades SEO</h1>
          <p className="text-sm text-[var(--muted)] mt-2">Search Console + inventário editorial + intenção comercial.</p>
        </div>
        <div className="text-xs text-[var(--muted)]">Período: {data.period.startDate} → {data.period.endDate}</div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          ["Reviews publicados", data.inventory.publishedReviews],
          ["Guias de compra", data.inventory.buyingGuides],
          ["Páginas de intenção", data.inventory.buyingIntentPages],
          ["Queries com oportunidade", data.queryOpportunities.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--surface)] border border-border rounded-xl p-5">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-display text-[var(--amber)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      {!data.searchConsole.configured && (
        <div className="mb-6 rounded-xl border border-border bg-[var(--surface)] p-5">
          <h2 className="font-heading font-bold">Conecte o Google Search Console</h2>
          <p className="text-sm text-[var(--muted)] mt-2">
            Defina <code>GSC_SITE_URL</code>, <code>GSC_CLIENT_EMAIL</code> e <code>GSC_PRIVATE_KEY</code> nas variáveis de ambiente da Vercel. A conta de serviço precisa ter acesso à propriedade no Search Console.
          </p>
          <p className="text-xs text-[var(--muted)] mt-2">Enquanto isso, o painel continua funcionando com oportunidades derivadas do inventário do Vetor.blog.</p>
        </div>
      )}

      {data.searchConsole.error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm">{data.searchConsole.error}</div>
      )}

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-6">
        <h2 className="font-heading font-bold mb-4">Queries: alta impressão + CTR baixa</h2>
        {data.queryOpportunities.length ? (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--muted)] border-b border-border">
              <th className="py-3 pr-4">Query</th><th className="py-3 pr-4">Página</th><th className="py-3 pr-4">Impressões</th><th className="py-3 pr-4">CTR</th><th className="py-3 pr-4">Pos.</th><th className="py-3">Ação</th>
            </tr></thead>
            <tbody>{data.queryOpportunities.map((item, index) => (
              <tr key={index} className="border-b border-border/60">
                <td className="py-3 pr-4 font-medium">{item.query}</td>
                <td className="py-3 pr-4 max-w-[280px] truncate">{item.page}</td>
                <td className="py-3 pr-4">{item.impressions}</td>
                <td className="py-3 pr-4">{item.ctr}%</td>
                <td className="py-3 pr-4">{item.position}</td>
                <td className="py-3 text-[var(--amber)]">{item.action}</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="text-sm text-[var(--muted)]">Nenhuma query elegível no período atual.</p>}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <h2 className="font-heading font-bold mb-4">Páginas perto da primeira página</h2>
          {data.pages.length ? data.pages.map((item) => (
            <div key={item.page} className="py-3 border-b border-border last:border-0">
              <p className="text-sm truncate">{item.page}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{item.impressions} impressões · {item.clicks} cliques · posição média {item.avgPosition}</p>
            </div>
          )) : <p className="text-sm text-[var(--muted)]">Sem dados suficientes ainda.</p>}
        </section>

        <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <h2 className="font-heading font-bold mb-4">Categorias que precisam de massa crítica</h2>
          {data.contentOpportunities.thinCategories.map((item) => (
            <div key={item.slug} className="py-3 border-b border-border last:border-0">
              <p className="text-sm">{item.category} <span className="text-[var(--muted)]">({item.reviews} reviews)</span></p>
              <p className="text-xs text-[var(--muted)] mt-1">{item.action}</p>
            </div>
          ))}
          {!data.contentOpportunities.thinCategories.length && <p className="text-sm text-[var(--muted)]">Nenhuma categoria abaixo do corte.</p>}
        </section>
      </div>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mt-6">
        <h2 className="font-heading font-bold mb-4">Próximas expansões comerciais</h2>
        {data.contentOpportunities.missingIntent.map((item) => (
          <div key={item.slug} className="py-3 border-b border-border last:border-0">
            <p className="text-sm">{item.category} <span className="text-[var(--muted)]">({item.reviews} reviews)</span></p>
            <p className="text-xs text-[var(--muted)] mt-1">{item.action}</p>
          </div>
        ))}
        {!data.contentOpportunities.missingIntent.length && <p className="text-sm text-[var(--muted)]">Todas as categorias elegíveis já têm as intenções disponíveis.</p>}
      </section>

      <p className="text-xs text-[var(--muted)] mt-6">Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}. As recomendações são regras operacionais do painel, não dados inventados do Google.</p>
    </div>
  );
}
