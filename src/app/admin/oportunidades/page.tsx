"use client";

import { useEffect, useState } from "react";

type SearchConsoleQuery = {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
};

type SearchConsolePage = {
  page: string;
  impressions: number;
  clicks: number;
  avgPosition: number;
};

type DashboardData = {
  generatedAt: string;
  period: { startDate: string; endDate: string };
  searchConsole: {
    configured: boolean;
    error: string | null;
    rows: number;
    uniqueQueries: number;
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
    topQueries: SearchConsoleQuery[];
    topPages: SearchConsolePage[];
  };
  inventory: {
    publishedReviews: number;
    comparisons: number;
    buyingGuides: number;
    buyingIntentPages: number;
  };
  queryOpportunities: Array<{
    query: string;
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
    action: string;
  }>;
  pages: SearchConsolePage[];
  contentOpportunities: {
    thinCategories: Array<{
      category: string;
      slug: string;
      reviews: number;
      action: string;
    }>;
    missingIntent: Array<{
      category: string;
      slug: string;
      reviews: number;
      action: string;
    }>;
  };
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

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
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar.")
      );
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-[var(--muted)]">
        Analisando oportunidades...
      </div>
    );
  }

  const searchConsoleReady =
    data.searchConsole.configured && !data.searchConsole.error;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--amber)] font-bold">
            Fase 4.4
          </p>
          <h1 className="font-display text-3xl mt-1">Oportunidades SEO</h1>
          <p className="text-sm text-[var(--muted)] mt-2">
            Search Console + inventário editorial + intenção comercial.
          </p>
        </div>
        <div className="text-xs text-[var(--muted)]">
          Período: {data.period.startDate} → {data.period.endDate}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          ["Reviews publicados", data.inventory.publishedReviews],
          ["Comparativos", data.inventory.comparisons],
          ["Guias de compra", data.inventory.buyingGuides],
          ["Páginas de intenção", data.inventory.buyingIntentPages],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="bg-[var(--surface)] border border-border rounded-xl p-5"
          >
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-display text-[var(--amber)] mt-1">
              {value}
            </p>
          </div>
        ))}
      </div>

      {!data.searchConsole.configured && (
        <div className="mb-6 rounded-xl border border-border bg-[var(--surface)] p-5">
          <h2 className="font-heading font-bold">Conecte o Google Search Console</h2>
          <p className="text-sm text-[var(--muted)] mt-2">
            Defina <code>GSC_SITE_URL</code>, <code>GSC_CLIENT_EMAIL</code> (ou{" "}
            <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>) e <code>GSC_PRIVATE_KEY</code>{" "}
            nas variáveis de ambiente da Vercel. A conta de serviço precisa ter acesso
            à propriedade no Search Console.
          </p>
          <p className="text-xs text-[var(--muted)] mt-2">
            Enquanto isso, o painel continua funcionando com oportunidades derivadas
            do inventário do Vetor.blog.
          </p>
        </div>
      )}

      {data.searchConsole.error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm">
          {data.searchConsole.error}
        </div>
      )}

      {searchConsoleReady && (
        <section className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
                Dados reais
              </p>
              <h2 className="font-heading font-bold text-xl mt-1">
                Google Search Console
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Métricas agregadas diretamente das linhas retornadas pelo Search Console
                no período acima.
              </p>
            </div>
            <div className="text-xs text-[var(--muted)]">
              {numberFormatter.format(data.searchConsole.rows)} combinações query + página
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              ["Impressões", numberFormatter.format(data.searchConsole.totalImpressions)],
              ["Cliques", numberFormatter.format(data.searchConsole.totalClicks)],
              ["CTR média", `${data.searchConsole.averageCtr}%`],
              ["Posição média", data.searchConsole.averagePosition],
              ["Queries únicas", numberFormatter.format(data.searchConsole.uniqueQueries)],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="bg-[var(--surface)] border border-border rounded-xl p-5"
              >
                <p className="text-xs text-[var(--muted)]">{label}</p>
                <p className="text-2xl font-display mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold mb-1">Top 20 queries por impressões</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Dados brutos agregados por consulta; as métricas de posição usam ponderação por impressões.
              </p>
              {data.searchConsole.topQueries.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--muted)] border-b border-border">
                        <th className="py-3 pr-4">Query</th>
                        <th className="py-3 pr-4">Impr.</th>
                        <th className="py-3 pr-4">Cliques</th>
                        <th className="py-3 pr-4">CTR</th>
                        <th className="py-3">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.searchConsole.topQueries.map((item) => (
                        <tr key={item.query} className="border-b border-border/60">
                          <td className="py-3 pr-4 font-medium max-w-[230px] truncate">
                            {item.query}
                          </td>
                          <td className="py-3 pr-4">
                            {numberFormatter.format(item.impressions)}
                          </td>
                          <td className="py-3 pr-4">{numberFormatter.format(item.clicks)}</td>
                          <td className="py-3 pr-4">{item.ctr}%</td>
                          <td className="py-3">{item.avgPosition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Nenhuma query retornada.</p>
              )}
            </section>

            <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
              <h3 className="font-heading font-bold mb-1">Top 20 páginas por impressões</h3>
              <p className="text-xs text-[var(--muted)] mb-4">
                Todas as páginas retornadas pelo Search Console, sem o filtro de oportunidade.
              </p>
              {data.searchConsole.topPages.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--muted)] border-b border-border">
                        <th className="py-3 pr-4">Página</th>
                        <th className="py-3 pr-4">Impr.</th>
                        <th className="py-3 pr-4">Cliques</th>
                        <th className="py-3">Pos.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.searchConsole.topPages.map((item) => (
                        <tr key={item.page} className="border-b border-border/60">
                          <td className="py-3 pr-4 max-w-[280px] truncate">{item.page}</td>
                          <td className="py-3 pr-4">
                            {numberFormatter.format(item.impressions)}
                          </td>
                          <td className="py-3 pr-4">{numberFormatter.format(item.clicks)}</td>
                          <td className="py-3">{item.avgPosition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">Nenhuma página retornada.</p>
              )}
            </section>
          </div>
        </section>
      )}

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-6">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
            Análise do Vetor.blog
          </p>
          <h2 className="font-heading font-bold text-xl mt-1">
            Queries: alta impressão + CTR baixa
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Filtro operacional separado dos dados brutos acima: impressões ≥ 20, posição entre 4 e 20 e CTR abaixo de 5%.
          </p>
        </div>
        {data.queryOpportunities.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-border">
                  <th className="py-3 pr-4">Query</th>
                  <th className="py-3 pr-4">Página</th>
                  <th className="py-3 pr-4">Impressões</th>
                  <th className="py-3 pr-4">CTR</th>
                  <th className="py-3 pr-4">Pos.</th>
                  <th className="py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.queryOpportunities.map((item, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td className="py-3 pr-4 font-medium">{item.query}</td>
                    <td className="py-3 pr-4 max-w-[280px] truncate">{item.page}</td>
                    <td className="py-3 pr-4">{item.impressions}</td>
                    <td className="py-3 pr-4">{item.ctr}%</td>
                    <td className="py-3 pr-4">{item.position}</td>
                    <td className="py-3 text-[var(--amber)]">{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Nenhuma query elegível no período atual.</p>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <h2 className="font-heading font-bold mb-1">Páginas perto da primeira página</h2>
          <p className="text-xs text-[var(--muted)] mb-4">
            Filtro operacional de páginas com potencial de avanço: 30+ impressões e posição média entre 8 e 25.
          </p>
          {data.pages.length ? (
            data.pages.map((item) => (
              <div key={item.page} className="py-3 border-b border-border last:border-0">
                <p className="text-sm truncate">{item.page}</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {item.impressions} impressões · {item.clicks} cliques · posição média {item.avgPosition}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">Sem dados suficientes ainda.</p>
          )}
        </section>

        <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
          <h2 className="font-heading font-bold mb-4">Categorias que precisam de massa crítica</h2>
          {data.contentOpportunities.thinCategories.map((item) => (
            <div key={item.slug} className="py-3 border-b border-border last:border-0">
              <p className="text-sm">
                {item.category}{" "}
                <span className="text-[var(--muted)]">({item.reviews} reviews)</span>
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">{item.action}</p>
            </div>
          ))}
          {!data.contentOpportunities.thinCategories.length && (
            <p className="text-sm text-[var(--muted)]">Nenhuma categoria abaixo do corte.</p>
          )}
        </section>
      </div>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mt-6">
        <h2 className="font-heading font-bold mb-4">Próximas expansões comerciais</h2>
        {data.contentOpportunities.missingIntent.map((item) => (
          <div key={item.slug} className="py-3 border-b border-border last:border-0">
            <p className="text-sm">
              {item.category}{" "}
              <span className="text-[var(--muted)]">({item.reviews} reviews)</span>
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">{item.action}</p>
          </div>
        ))}
        {!data.contentOpportunities.missingIntent.length && (
          <p className="text-sm text-[var(--muted)]">
            Todas as categorias elegíveis já têm as intenções disponíveis.
          </p>
        )}
      </section>

      <p className="text-xs text-[var(--muted)] mt-6">
        Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")}. Os números
        da seção Google Search Console são dados retornados pela API no período indicado;
        filtros e ações abaixo são regras operacionais do Vetor.blog.
      </p>
    </div>
  );
}
