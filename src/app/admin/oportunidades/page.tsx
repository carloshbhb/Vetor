"use client";

import { useEffect, useMemo, useState } from "react";

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
  actionQueue: Array<{
    type: string;
    priority: "Alta" | "Média";
    title: string;
    detail: string;
    evidence: string;
    action: string;
    source: string;
    href: string;
    fingerprint: string;
    impressions: number;
    brief: {
      objective: string;
      contentAction: string;
      suggestedTitle: string;
      validation: string;
    };
  }>;
  intelligence: {
    ctrOpportunities: Array<{
      query: string;
      page: string;
      currentTitle: string;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number;
      titleSuggestion: string;
    }>;
    positionOpportunities: Array<{
      page: string;
      impressions: number;
      clicks: number;
      avgPosition: number;
      action: string;
    }>;
    cannibalization: Array<{
      query: string;
      impressions: number;
      pages: Array<{
        page: string;
        impressions: number;
        clicks: number;
        avgPosition: number;
      }>;
      leaderShare: number;
      action: string;
    }>;
    contentGaps: Array<{
      query: string;
      impressions: number;
      avgPosition: number;
      leadingPage: string;
      signal: string;
      suggestedRoute: string;
    }>;
  };
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
  keywordIntelligence: {
    totalStored: number;
    relevant: number;
    lowFit: number;
    items: Array<{
      keyword: string;
      intent: string;
      opportunityScore: number;
      vetorFitScore: number;
      commercialScore: number;
      competitionScore: number;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number | null;
      suggestedRoute: string;
      routeExists: boolean;
      relevant: boolean;
      reason: string;
    }>;
  };  keywordIntelligence: {
    totalStored: number;
    relevant: number;
    lowFit: number;
    items: Array<{
      keyword: string;
      intent: string;
      opportunityScore: number;
      vetorFitScore: number;
      commercialScore: number;
      competitionScore: number;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number | null;
      suggestedRoute: string;
      routeExists: boolean;
      relevant: boolean;
      reason: string;
    }>;
  };
  editorialQueue: {
    total: number;
    items: Array<{
      keyword: string;
      intent: string;
      opportunityScore: number;
      vetorFitScore: number;
      commercialScore: number;
      competitionScore: number;
      impressions: number;
      clicks: number;
      ctr: number;
      position: number | null;
      suggestedRoute: string;
      action: "otimizar_url_existente" | "validar_serp_e_criar";
      priority: "Alta" | "Média";
      brief: {
        objective: string;
        contentAction: string;
        suggestedTitle: string;
        validation: string;
      };
    }>;
  };
};

type SeoActionStatus = "open" | "in_progress" | "done" | "dismissed";

type SeoActionRecord = {
  id: string;
  fingerprint: string;
  signal_type: string;
  priority: "Alta" | "Média";
  title: string;
  detail: string;
  evidence: string;
  action: string;
  source: string;
  href: string;
  impressions: number;
  brief: {
    objective: string;
    contentAction: string;
    suggestedTitle: string;
    validation: string;
  };
  status: SeoActionStatus;
  notes: string;
  first_seen_at: string;
  last_seen_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  before_impressions: number | null;
  after_impressions: number | null;
  before_clicks: number | null;
  after_clicks: number | null;
  before_ctr: number | null;
  after_ctr: number | null;
  before_position: number | null;
  after_position: number | null;
  impact_status: "waiting" | "measured" | "no_data" | null;
  impact_period_days: number | null;
  impact_measured_at: string | null;
  cycle_status: "new" | "active" | "persistent" | "recurring" | "resolved_signal" | "waiting_impact";
  recurrence_count: number;
  resolved_signal_at: string | null;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch("/api/admin/opportunities", { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar o dashboard.");
  return response.json();
}

export default function OpportunitiesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [history, setHistory] = useState<SeoActionRecord[]>([]);
  const [error, setError] = useState("");
  const [historySyncError, setHistorySyncError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);
  const [measuringImpact, setMeasuringImpact] = useState(false);

  const loadDashboard = async () => {
    const dashboard = await fetchDashboardData();
    setData(dashboard);

    try {
      const syncResponse = await fetch("/api/admin/seo-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ actions: dashboard.actionQueue }),
      });
      const syncData = await syncResponse.json().catch(() => ({}));
      if (!syncResponse.ok) {
        throw new Error(syncData.error || "Não foi possível sincronizar o histórico SEO.");
      }

      setHistory(Array.isArray(syncData.history) ? syncData.history : []);
      setHistorySyncError("");
    } catch (err) {
      setHistorySyncError(err instanceof Error ? err.message : "Não foi possível sincronizar o histórico SEO.");
    }
  };

  useEffect(() => {
    loadDashboard().catch((err) =>
      setError(err instanceof Error ? err.message : "Erro ao carregar.")
    );
  }, []);

  const refreshDashboard = async () => {
    setRefreshing(true);
    setError("");
    setHistorySyncError("");
    try {
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setRefreshing(false);
    }
  };

  const updateActionStatus = async (id: string, status: SeoActionStatus) => {
    setUpdatingAction(id);
    setError("");
    try {
      const response = await fetch("/api/admin/seo-actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível atualizar a ação.");
      }
      if (payload.item) {
        setHistory((current) =>
          current.map((item) => (item.id === id ? payload.item : item))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar ação.");
    } finally {
      setUpdatingAction(null);
    }
  };

  const measureImpact = async () => {
    setMeasuringImpact(true);
    setError("");
    try {
      const response = await fetch("/api/admin/seo-actions", {
        method: "PUT",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível medir o impacto.");
      }
      setHistory(Array.isArray(payload.history) ? payload.history : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao medir impacto.");
    } finally {
      setMeasuringImpact(false);
    }
  };

  const historyByFingerprint = useMemo(
    () => new Map(history.map((item) => [item.fingerprint, item])),
    [history]
  );

  const activeQueue = useMemo(
    () =>
      data?.actionQueue.filter((item) => {
        const record = historyByFingerprint.get(item.fingerprint);
        return !record || (record.status !== "done" && record.status !== "dismissed");
      }) || [],
    [data?.actionQueue, historyByFingerprint]
  );

  const historySummary = useMemo(
    () => ({
      open: history.filter((item) => item.status === "open").length,
      inProgress: history.filter((item) => item.status === "in_progress").length,
      done: history.filter((item) => item.status === "done").length,
      dismissed: history.filter((item) => item.status === "dismissed").length,
      recurring: history.filter((item) => item.cycle_status === "recurring").length,
      persistent: history.filter((item) => item.cycle_status === "persistent").length,
      resolved: history.filter((item) => item.cycle_status === "resolved_signal").length,
      waitingImpact: history.filter((item) => item.impact_status === "waiting").length,
    }),
    [history]
  );

  const cycleAlerts = useMemo(
    () =>
      history
        .filter((item) =>
          item.cycle_status === "recurring" ||
          item.cycle_status === "persistent" ||
          item.impact_status === "waiting"
        )
        .sort((a, b) => {
          const weight = (item: SeoActionRecord) =>
            item.cycle_status === "recurring" ? 3 : item.cycle_status === "persistent" ? 2 : 1;
          return weight(b) - weight(a) || b.impressions - a.impressions;
        })
        .slice(0, 8),
    [history]
  );

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
      {historySyncError && (
        <div role="status" className="mb-5 rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/5 px-4 py-3 text-sm text-[var(--text)]">
          O painel de oportunidades foi carregado, mas o histórico de ações não sincronizou: {historySyncError}
        </div>
      )}
      <div className="flex flex-col gap-4 mb-8 rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] font-black text-[#956400]">
            Fase 11
          </p>
          <h1 className="mt-1 font-display text-3xl font-black leading-tight text-[#101722] sm:text-4xl">Oportunidades SEO</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#3f4b59]">
            Search Console + inventário editorial + intenção comercial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="text-xs text-[var(--muted)]">
            Período: {data.period.startDate} → {data.period.endDate}
          </div>
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="min-h-[42px] rounded-lg border border-[#c9d1da] bg-white px-4 py-2 text-xs font-extrabold text-[#101722] shadow-sm hover:bg-[#f5f7f9] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#5f8dff]"
          >
            {refreshing ? "Atualizando..." : "Atualizar dados"}
          </button>
          <button
            type="button"
            onClick={measureImpact}
            disabled={measuringImpact || historySummary.done === 0}
            className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-[var(--surface2)] disabled:opacity-50"
          >
            {measuringImpact ? "Medindo..." : "Medir impacto"}
          </button>
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

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
              Fase 5 · radar validado
            </p>
            <h2 className="font-heading font-bold text-xl mt-1">Palavras-chave com aderência ao Vetor</h2>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-3xl">
              O radar não transforma qualquer tendência em pauta: prioriza termos comerciais, aderentes ao inventário e com rota válida ou forte fit editorial.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em]">
            <span className="rounded-full border border-border px-2 py-1">Armazenadas: {data.keywordIntelligence.totalStored}</span>
            <span className="rounded-full border border-border px-2 py-1 text-[#176b3a]">Relevantes: {data.keywordIntelligence.relevant}</span>
            <span className="rounded-full border border-border px-2 py-1">Baixo fit: {data.keywordIntelligence.lowFit}</span>
          </div>
        </div>
        {data.keywordIntelligence.items.length ? (
          <div className="space-y-2">
            {data.keywordIntelligence.items.slice(0, 12).map((item) => (
              <div key={item.keyword} className="rounded-lg border border-border/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm break-words">{item.keyword}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-1">
                      {item.intent} · oportunidade {item.opportunityScore.toFixed(1)} · fit {item.vetorFitScore.toFixed(0)} · {item.impressions} impressões
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#b9d9c4] bg-[#f0faf3] px-2 py-1 text-[10px] font-bold text-[#176b3a]">
                    {item.routeExists ? "Rota existente" : "Validar SERP"}
                  </span>
                </div>
                <p className="text-xs mt-2 text-[var(--muted)]">{item.reason}</p>
                {item.suggestedRoute && (
                  <p className="mt-2 text-xs font-medium break-all">{item.suggestedRoute}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-5 text-sm text-[var(--muted)]">
            Nenhuma oportunidade passou pelo filtro de relevância. Isso é preferível a criar páginas fora do escopo.
          </div>
        )}
      </section>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">Fase 7 · máquina editorial</p>
            <h2 className="font-heading font-bold text-xl mt-1">Fila editorial priorizada</h2>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-3xl">
              A fila separa otimização de URLs existentes da criação de novas páginas. Nenhuma pauta nova é publicada sem validação de SERP, intenção e oferta.
            </p>
          </div>
          <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
            {data.editorialQueue.total} prioridades
          </span>
        </div>
        {data.editorialQueue.items.length ? (
          <div className="space-y-2">
            {data.editorialQueue.items.slice(0, 15).map((item) => (
              <div key={item.keyword} className="rounded-lg border border-border/70 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{item.keyword}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-1">
                      {item.intent} · oportunidade {item.opportunityScore.toFixed(1)} · fit {item.vetorFitScore.toFixed(0)} · {item.impressions} impressões
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold">{item.priority}</span>
                </div>
                <p className="text-xs mt-2">{item.action === "otimizar_url_existente" ? "Otimizar URL existente" : "Validar SERP antes de criar"}</p>
                <p className="text-xs text-[var(--muted)] mt-1">{item.brief.suggestedTitle}</p>
                <p className="text-[11px] text-[var(--muted)] mt-1">{item.brief.validation}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">Nenhuma pauta passou pelos critérios.</p>}
      </section>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
              Fase 6 · operação SEO
            </p>
            <h2 className="font-heading font-bold text-xl mt-1">Fila de execução</h2>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-3xl">
              Sinais da Fase 5 transformados em tarefas de investigação e melhoria. A prioridade é uma regra operacional do Vetor.blog, não uma recomendação do Google.
            </p>
          </div>
          <span className="text-xs text-[var(--muted)]">
            {activeQueue.length} tarefas abertas
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 text-[10px] uppercase tracking-[0.12em]">
          <span className="rounded-full border border-border px-2 py-1">Abertas: {historySummary.open}</span>
          <span className="rounded-full border border-border px-2 py-1">Em andamento: {historySummary.inProgress}</span>
          <span className="rounded-full border border-border px-2 py-1">Concluídas: {historySummary.done}</span>
          <span className="rounded-full border border-border px-2 py-1">Dispensadas: {historySummary.dismissed}</span>
        </div>

        {activeQueue.length ? (
          <div className="space-y-3">
            {activeQueue.map((item, index) => { 
              const record = historyByFingerprint.get(item.fingerprint);
              const status = record?.status || "open";
              return (
              <div
                key={item.type + "|" + item.detail + "|" + index}
                className="rounded-lg border border-border/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        {item.type}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-[var(--amber)]">
                        Prioridade {item.priority}
                      </span>
                    </div>
                    <p className="font-heading font-bold mt-1">{item.title}</p>
                    <p className="text-sm mt-1 break-words">{item.detail}</p>
                    <p className="text-xs text-[var(--muted)] mt-2">{item.evidence}</p>
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                      className="shrink-0 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-[var(--surface2)]"
                    >
                      Abrir referência
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--amber)] mt-3">{item.action}</p>
                <button
                  type="button"
                  onClick={() => {
                    const key = item.type + "|" + item.detail + "|" + index;
                    setExpandedTask(expandedTask === key ? null : key);
                  }}
                  className="mt-3 px-3 py-2 rounded-lg bg-[var(--surface2)] border border-border text-xs font-medium hover:bg-[var(--bg)]"
                >
                  {expandedTask === item.type + "|" + item.detail + "|" + index
                    ? "Ocultar briefing"
                    : "Abrir briefing editorial"}
                </button>
                {expandedTask === item.type + "|" + item.detail + "|" + index && (
                  <div className="mt-3 rounded-lg bg-[var(--surface2)] p-4 text-xs space-y-3">
                    <div>
                      <p className="font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Objetivo</p>
                      <p className="mt-1">{item.brief.objective}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Ação editorial</p>
                      <p className="mt-1">{item.brief.contentAction}</p>
                    </div>
                    {item.brief.suggestedTitle && (
                      <div>
                        <p className="font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Title sugerido</p>
                        <p className="mt-1">{item.brief.suggestedTitle}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-bold uppercase tracking-[0.12em] text-[var(--muted)]">Validação</p>
                      <p className="mt-1">{item.brief.validation}</p>
                    </div>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {status === "open" && (
                    <button
                      type="button"
                      onClick={() => updateActionStatus(record!.id, "in_progress")}
                      disabled={updatingAction === record?.id}
                      className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-[var(--surface2)] disabled:opacity-50"
                    >
                      Iniciar
                    </button>
                  )}
                  {status === "in_progress" && (
                    <button
                      type="button"
                      onClick={() => updateActionStatus(record!.id, "done")}
                      disabled={updatingAction === record?.id}
                      className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-[var(--surface2)] disabled:opacity-50"
                    >
                      Marcar concluída
                    </button>
                  )}
                  {status !== "done" && (
                    <button
                      type="button"
                      onClick={() => updateActionStatus(record!.id, "dismissed")}
                      disabled={updatingAction === record?.id}
                      className="px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-[var(--surface2)] disabled:opacity-50"
                    >
                      Dispensar
                    </button>
                  )}
                  <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] self-center">
                    {status === "open" ? "Aberta" : "Em andamento"}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--muted)] mt-2">{item.source}</p>
              </div>
            );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Nenhuma tarefa automática disponível no corte atual.
          </p>
        )}
      </section>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
            Fase 8 · acompanhamento
          </p>
          <h2 className="font-heading font-bold text-xl mt-1">Histórico de ações SEO</h2>
          <p className="text-xs text-[var(--muted)] mt-1">
            Registra quando um sinal apareceu, quando foi revisado e qual foi o estado operacional escolhido.
          </p>
        </div>

        {history.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-border">
                  <th className="py-3 pr-4">Ação</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Última ocorrência</th>
                  <th className="py-3">Controle</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 50).map((item) => (
                  <tr key={item.id} className="border-b border-border/60 align-top">
                    <td className="py-3 pr-4 min-w-[260px]">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-1">{item.detail}</p>
                      <p className="text-xs text-[var(--muted)] mt-1">{item.evidence}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs">{item.signal_type}</td>
                    <td className="py-3 pr-4">
                      <span className="text-xs uppercase tracking-[0.08em] font-bold">
                        {item.status === "open"
                          ? "Aberta"
                          : item.status === "in_progress"
                            ? "Em andamento"
                            : item.status === "done"
                              ? "Concluída"
                              : "Dispensada"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                      {new Date(item.last_seen_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3">
                      {item.status === "done" || item.status === "dismissed" ? (
                        <button
                          type="button"
                          onClick={() => updateActionStatus(item.id, "open")}
                          disabled={updatingAction === item.id}
                          className="text-xs text-[var(--amber)] hover:underline disabled:opacity-50"
                        >
                          Reabrir
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Nenhum histórico registrado ainda.</p>
        )}
      </section>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
            Fase 11 · ciclo SEO
          </p>
          <h2 className="font-heading font-bold text-xl mt-1">Tendência e alertas operacionais</h2>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-3xl">
            O painel usa o histórico do Vetor.blog para destacar recorrências, sinais persistentes e medições que ainda aguardam dados. Não são classificações do Google.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            ["Recorrentes", historySummary.recurring],
            ["Persistentes", historySummary.persistent],
            ["Sinais resolvidos", historySummary.resolved],
            ["Aguardando impacto", historySummary.waitingImpact],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-border/70 p-4">
              <p className="text-xs text-[var(--muted)]">{label}</p>
              <p className="text-2xl font-display mt-1">{value}</p>
            </div>
          ))}
        </div>

        {cycleAlerts.length ? (
          <div className="space-y-3">
            {cycleAlerts.map((item) => {
              const recurring = item.cycle_status === "recurring";
              const waiting = item.impact_status === "waiting";
              const label = recurring ? "Recorrente" : item.cycle_status === "persistent" ? "Persistente" : "Aguardando impacto";
              const action = recurring
                ? "Reabrir e revisar a implementação; o mesmo sinal voltou ao histórico."
                : waiting
                  ? "Aguardar dados suficientes e medir novamente."
                  : "Verificar se a ação foi aplicada e reavaliar o sinal atual.";
              return (
                <div key={item.id} className="rounded-lg border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--amber)] font-bold">{label}</span>
                        {item.recurrence_count > 0 ? (
                          <span className="text-[10px] text-[var(--muted)]">{item.recurrence_count} retorno(s)</span>
                        ) : null}
                      </div>
                      <p className="font-medium mt-1">{item.title}</p>
                      <p className="text-xs text-[var(--muted)] mt-1">{numberFormatter.format(item.impressions)} impressões registradas</p>
                    </div>
                    <a href={item.href} className="text-xs text-[var(--amber)] hover:underline">Abrir página</a>
                  </div>
                  <p className="text-xs mt-3 text-[var(--muted)]">{action}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">Nenhum alerta operacional no histórico atual.</p>
        )}
      </section>

      <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
              Fase 9 · medição de impacto
            </p>
            <h2 className="font-heading font-bold text-xl mt-1">Antes × depois</h2>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-3xl">
              Compara períodos equivalentes do Search Console a partir da conclusão da ação. A variação é um sinal temporal e não prova causalidade.
            </p>
          </div>
          <span className="text-xs text-[var(--muted)]">
            {history.filter((item) => item.impact_status === "measured").length} medições disponíveis
          </span>
        </div>

        {history.some((item) => item.status === "done") ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--muted)] border-b border-border">
                  <th className="py-3 pr-4">Ação</th>
                  <th className="py-3 pr-4">Período</th>
                  <th className="py-3 pr-4">Impressões</th>
                  <th className="py-3 pr-4">Cliques</th>
                  <th className="py-3 pr-4">CTR</th>
                  <th className="py-3">Posição</th>
                </tr>
              </thead>
              <tbody>
                {history.filter((item) => item.status === "done").slice(0, 25).map((item) => {
                  const imprPair = item.before_impressions != null && item.after_impressions != null;
                  const clickPair = item.before_clicks != null && item.after_clicks != null;
                  const ctrPair = item.before_ctr != null && item.after_ctr != null;
                  const posPair = item.before_position != null && item.after_position != null;
                  const imprDelta = imprPair ? item.after_impressions! - item.before_impressions! : null;
                  const clickDelta = clickPair ? item.after_clicks! - item.before_clicks! : null;
                  const ctrDelta = ctrPair ? item.after_ctr! - item.before_ctr! : null;
                  const posDelta = posPair ? item.after_position! - item.before_position! : null;
                  const imprPct = imprPair && item.before_impressions !== 0 ? (imprDelta! / item.before_impressions!) * 100 : null;
                  const clickPct = clickPair && item.before_clicks !== 0 ? (clickDelta! / item.before_clicks!) * 100 : null;
                  const statusLabel =
                    item.impact_status === "measured" ? "Medido" :
                    item.impact_status === "waiting" ? "Aguardando dados" :
                    item.impact_status === "no_data" ? "Sem dados" : "Não medido";
                  return (
                    <tr key={item.id} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-4 min-w-[250px]">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-[var(--muted)] mt-1">{item.detail}</p>
                        <p className="text-xs text-[var(--amber)] mt-1">{statusLabel}</p>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[var(--muted)]">
                        {item.impact_period_days ? item.impact_period_days + " dias" : "—"}
                        {item.impact_measured_at ? <p className="mt-1">medido {new Date(item.impact_measured_at).toLocaleDateString("pt-BR")}</p> : null}
                      </td>
                      <td className="py-3 pr-4">
                        {imprPair ? numberFormatter.format(item.before_impressions!) + " → " + numberFormatter.format(item.after_impressions!) : "—"}
                        {imprDelta != null ? <p className="text-xs text-[var(--muted)] mt-1">{imprDelta >= 0 ? "+" : ""}{numberFormatter.format(imprDelta)}{imprPct != null ? " (" + (imprPct >= 0 ? "+" : "") + imprPct.toFixed(1) + "%)" : ""}</p> : null}
                      </td>
                      <td className="py-3 pr-4">
                        {clickPair ? numberFormatter.format(item.before_clicks!) + " → " + numberFormatter.format(item.after_clicks!) : "—"}
                        {clickDelta != null ? <p className="text-xs text-[var(--muted)] mt-1">{clickDelta >= 0 ? "+" : ""}{numberFormatter.format(clickDelta)}{clickPct != null ? " (" + (clickPct >= 0 ? "+" : "") + clickPct.toFixed(1) + "%)" : ""}</p> : null}
                      </td>
                      <td className="py-3 pr-4">
                        {ctrPair ? item.before_ctr!.toFixed(2) + "% → " + item.after_ctr!.toFixed(2) + "%" : "—"}
                        {ctrDelta != null ? <p className="text-xs text-[var(--muted)] mt-1">{ctrDelta >= 0 ? "+" : ""}{ctrDelta.toFixed(2)} pp</p> : null}
                      </td>
                      <td className="py-3">
                        {posPair ? item.before_position!.toFixed(1) + " → " + item.after_position!.toFixed(1) : "—"}
                        {posDelta != null ? <p className="text-xs text-[var(--muted)] mt-1">{posDelta > 0 ? "+" : ""}{posDelta.toFixed(1)}</p> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            Marque uma ação como concluída e use “Medir impacto” quando houver pelo menos 7 dias completos de dados posteriores.
          </p>
        )}
      </section>

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

      {searchConsoleReady && (
        <>
          <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
                Fase 5 · sinais automáticos
              </p>
              <h2 className="font-heading font-bold text-xl mt-1">Oportunidades de CTR</h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Queries com 20+ impressões, posição entre 4 e 15 e CTR abaixo de 5%. A sugestão de title é automática e deve ser revisada antes de publicar.
              </p>
            </div>
            {data.intelligence.ctrOpportunities.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted)] border-b border-border">
                      <th className="py-3 pr-4">Query</th>
                      <th className="py-3 pr-4">Página</th>
                      <th className="py-3 pr-4">CTR</th>
                      <th className="py-3 pr-4">Pos.</th>
                      <th className="py-3">Title sugerido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.intelligence.ctrOpportunities.slice(0, 10).map((item, index) => (
                      <tr key={item.page + "|" + item.query + "|" + index} className="border-b border-border/60 align-top">
                        <td className="py-3 pr-4 font-medium">{item.query}</td>
                        <td className="py-3 pr-4 max-w-[260px]">
                          <p className="truncate">{item.page}</p>
                          <p className="text-xs text-[var(--muted)] mt-1 truncate">{item.currentTitle}</p>
                        </td>
                        <td className="py-3 pr-4">{item.ctr}%</td>
                        <td className="py-3 pr-4">{item.position}</td>
                        <td className="py-3 max-w-[360px]">{item.titleSuggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Nenhuma oportunidade de CTR no corte atual.</p>
            )}
          </section>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
                Fase 5 · sinais automáticos
              </p>
              <h2 className="font-heading font-bold text-xl mt-1">Oportunidades de posição</h2>
              <p className="text-xs text-[var(--muted)] mt-1 mb-4">
                Páginas com 30+ impressões e posição média entre 5 e 15.
              </p>
              {data.intelligence.positionOpportunities.length ? (
                data.intelligence.positionOpportunities.slice(0, 10).map((item) => (
                  <div key={item.page} className="py-3 border-b border-border last:border-0">
                    <p className="text-sm truncate">{item.page}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {numberFormatter.format(item.impressions)} impressões · {numberFormatter.format(item.clicks)} cliques · posição {item.avgPosition}
                    </p>
                    <p className="text-xs text-[var(--amber)] mt-1">{item.action}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Nenhuma página elegível.</p>
              )}
            </section>

            <section className="bg-[var(--surface)] border border-border rounded-xl p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
                Fase 5 · sinais automáticos
              </p>
              <h2 className="font-heading font-bold text-xl mt-1">Possível canibalização</h2>
              <p className="text-xs text-[var(--muted)] mt-1 mb-4">
                Consultas com 30+ impressões distribuídas entre duas ou mais URLs. É um sinal para investigação, não uma conclusão.
              </p>
              {data.intelligence.cannibalization.length ? (
                data.intelligence.cannibalization.slice(0, 8).map((item) => (
                  <div key={item.query} className="py-3 border-b border-border last:border-0">
                    <p className="text-sm font-medium">{item.query}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">
                      {numberFormatter.format(item.impressions)} impressões · {item.pages.length} URLs · maior participação {item.leaderShare}%
                    </p>
                    {item.pages.slice(0, 3).map((page) => (
                      <p key={page.page} className="text-xs mt-1 truncate">
                        {page.page} · {numberFormatter.format(page.impressions)} impr. · pos. {page.avgPosition}
                      </p>
                    ))}
                    <p className="text-xs text-[var(--amber)] mt-2">{item.action}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Nenhum sinal no corte atual.</p>
              )}
            </section>
          </div>

          <section className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">
              Fase 5 · sinais automáticos
            </p>
            <h2 className="font-heading font-bold text-xl mt-1">Possíveis lacunas de conteúdo</h2>
            <p className="text-xs text-[var(--muted)] mt-1 mb-4">
              O painel cruza a intenção comercial detectada na query com a URL que hoje recebe as impressões. São oportunidades para análise editorial.
            </p>
            {data.intelligence.contentGaps.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--muted)] border-b border-border">
                      <th className="py-3 pr-4">Query</th>
                      <th className="py-3 pr-4">Impr.</th>
                      <th className="py-3 pr-4">Pos.</th>
                      <th className="py-3 pr-4">Página atual</th>
                      <th className="py-3">Rota a avaliar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.intelligence.contentGaps.map((item) => (
                      <tr key={item.query + "|" + item.leadingPage} className="border-b border-border/60 align-top">
                        <td className="py-3 pr-4 font-medium">{item.query}</td>
                        <td className="py-3 pr-4">{numberFormatter.format(item.impressions)}</td>
                        <td className="py-3 pr-4">{item.avgPosition}</td>
                        <td className="py-3 pr-4 max-w-[280px]">
                          <p className="truncate">{item.leadingPage}</p>
                          <p className="text-xs text-[var(--muted)] mt-1">{item.signal}</p>
                        </td>
                        <td className="py-3">{item.suggestedRoute}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">Nenhuma lacuna potencial identificada no corte atual.</p>
            )}
          </section>
        </>
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
