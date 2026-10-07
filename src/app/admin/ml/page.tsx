"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  affiliate_link_id: string;
  search_query: string;
  matched_item_id: string | null;
  matched_title: string | null;
  matched_url: string | null;
  sold_quantity: number | null;
  rank_position: number | null;
  match_score: number | null;
  match_status: "pending" | "matched" | "review" | "no_match" | "error";
  checked_at: string | null;
  error_message: string | null;
  candidate_data: Array<{
    itemId: string;
    title: string;
    url: string;
    soldQuantity: number;
    score: number;
  }>;
  updated_at: string;
};

type StatusResponse = {
  total: number;
  checked: number;
  remaining: number;
  counts: Record<string, number>;
  matches: Match[];
};

type BatchResult = {
  id: string;
  slug?: string | null;
  name: string;
  ok: boolean;
  matchStatus: Match["match_status"];
  matchedTitle: string | null;
  matchedUrl: string | null;
  soldQuantity: number | null;
  score: number | null;
  error: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(value: Match["match_status"]) {
  return {
    matched: "Confiável",
    review: "Revisar",
    no_match: "Sem resultado",
    error: "Erro",
    pending: "Pendente",
  }[value];
}

function statusClass(value: Match["match_status"]) {
  if (value === "matched") return "text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20";
  if (value === "review") return "text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20";
  if (value === "error") return "text-[var(--red)] bg-[var(--red)]/10 border-[var(--red)]/20";
  return "text-[var(--muted)] bg-[var(--surface2)] border-border";
}

export default function MercadoLivreAdminPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [copied, setCopied] = useState("");
  const [lastBatch, setLastBatch] = useState<BatchResult[]>([]);

  const loadStatus = useCallback(async () => {
    try {
      const [oauthResponse, response] = await Promise.all([
        fetch("/api/ml/auth?status=true", { cache: "no-store" }),
        fetch("/api/admin/mercadolivre/batch", { cache: "no-store" }),
      ]);
      const oauth = await oauthResponse.json().catch(() => ({}));
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a fila do Mercado Livre.");
      setAuthorized(Boolean(oauth.authenticated));
      setStatus(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connect = async () => {
    setError("");
    try {
      const response = await fetch("/api/ml/auth", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.authorizationUrl) throw new Error(payload.error || "Não foi possível iniciar a autorização.");
      window.location.assign(payload.authorizationUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível conectar ao Mercado Livre.");
    }
  };

  const processNext = async (refresh = false) => {
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/mercadolivre/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 8, refresh }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Falha ao pesquisar no Mercado Livre.");
      setLastBatch(Array.isArray(payload.results) ? payload.results : []);
      setNotice(
        payload.processed
          ? payload.processed + " link(s) pesquisado(s)."
          : payload.message || "Nenhum link para processar."
      );
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na busca.");
    } finally {
      setProcessing(false);
    }
  };

  const processAll = async () => {
    setProcessing(true);
    setError("");
    setNotice("");
    try {
      let completed = 0;
      for (let i = 0; i < 40; i += 1) {
        const response = await fetch("/api/admin/mercadolivre/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 8 }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Falha durante a busca.");
        completed += Number(payload.processed || 0);
        if (Array.isArray(payload.results) && payload.results.length) {
          setLastBatch((current) => [...current, ...payload.results].slice(-8));
        }
        if (!payload.processed) break;
        setNotice(completed + " links pesquisados nesta execução...");
      }
      await loadStatus();
      setNotice(completed + " links pesquisados nesta execução.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "A execução em lote foi interrompida.");
      await loadStatus();
    } finally {
      setProcessing(false);
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      window.setTimeout(() => setCopied(""), 1400);
    } catch {
      setError("Não foi possível copiar a URL.");
    }
  };

  const filteredMatches = useMemo(() => {
    if (!status) return [];
    const q = search.trim().toLowerCase();
    return status.matches.filter((item) => {
      if (statusFilter && item.match_status !== statusFilter) return false;
      if (!q) return true;
      return [item.search_query, item.matched_title || "", item.matched_item_id || ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [status, search, statusFilter]);

  // Reprocessamento manual: permite repetir buscas mesmo quando a fila pendente chegou a zero.
  if (loading) {
    return <div className="py-20 text-center text-[var(--muted)]">Carregando integração Mercado Livre...</div>;
  }

  const progress = status ? Math.round((status.checked / Math.max(status.total, 1)) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--amber)] font-bold">Pesquisa comercial</p>
          <h1 className="font-display text-3xl mt-1">Mercado Livre · anúncios mais vendidos</h1>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-4xl">
            Pesquisa os produtos da Central de Afiliados no Mercado Livre, prioriza resultados com maior quantidade vendida
            e guarda a URL do anúncio separadamente. O destino de afiliado atual nunca é substituído automaticamente.
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 text-[var(--red)] px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 text-[var(--green)] px-4 py-3 text-sm">{notice}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Links elegíveis</p>
          <p className="text-2xl font-display text-[var(--amber)] mt-1">{status?.total ?? 0}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Pesquisados</p>
          <p className="text-2xl font-display text-[var(--amber)] mt-1">{status?.checked ?? 0}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Confiáveis</p>
          <p className="text-2xl font-display text-[var(--green)] mt-1">{status?.counts?.matched ?? 0}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Revisão</p>
          <p className="text-2xl font-display text-[var(--amber)] mt-1">{status?.counts?.review ?? 0}</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={"text-sm font-semibold " + (authorized ? "text-[var(--green)]" : "text-[var(--amber)]")}>
              {authorized ? "Mercado Livre conectado" : "Mercado Livre ainda não autorizado"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {authorized
                ? "O backend possui uma sessão OAuth e pode renovar o access token quando necessário."
                : "Autorize a aplicação com a conta administradora do Mercado Livre."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!authorized && (
              <button onClick={connect} className="bg-[var(--amber)] text-black font-heading font-extrabold px-4 py-2.5 rounded-xl hover:bg-white">
                Conectar Mercado Livre
              </button>
            )}
            <button
              onClick={() => processNext()}
              disabled={processing || !authorized || !status?.remaining}
              className="border border-border px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--surface2)] disabled:opacity-50"
            >
              {processing ? "Pesquisando..." : "Pesquisar próximos 8"}
            </button>
            <button
              onClick={() => processNext(true)}
              disabled={processing || !authorized}
              className="border border-[var(--amber)]/40 text-[var(--amber)] px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--surface2)] disabled:opacity-50"
            >
              {processing ? "Pesquisando..." : "Buscar novamente"}
            </button>
            <button
              onClick={processAll}
              disabled={processing || !authorized || !status?.remaining}
              className="bg-[var(--green)] text-black font-heading font-extrabold px-4 py-2.5 rounded-xl hover:bg-white disabled:opacity-50"
            >
              {processing ? "Executando..." : "Processar os restantes"}
            </button>
          </div>
        </div>

        <div className="mt-5 h-2 rounded-full bg-[var(--surface2)] overflow-hidden">
          <div className="h-full bg-[var(--amber)] transition-all" style={{ width: progress + "%" }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[var(--muted)]">
          <span>{progress}% concluído</span>
          <span>{status?.remaining ?? 0} restantes</span>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Produto, título encontrado ou item ID..."
            className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--amber)]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">Todos os resultados</option>
            <option value="matched">Confiáveis</option>
            <option value="review">Revisão</option>
            <option value="no_match">Sem resultado</option>
            <option value="error">Erros</option>
          </select>
        </div>
      </div>

      {lastBatch.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--amber)]/30 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">Validação da última execução</p>
              <h2 className="font-heading font-bold mt-1">O que o Mercado Livre realmente retornou</h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Este diagnóstico vem da própria resposta da busca e não depende de permissões de leitura pública do Supabase.
              </p>
            </div>
            <div className="text-xs text-[var(--muted)]">
              {lastBatch.filter((item) => item.matchStatus === "matched").length} confiáveis ·{" "}
              {lastBatch.filter((item) => item.matchStatus === "review").length} revisão ·{" "}
              {lastBatch.filter((item) => item.matchStatus === "no_match").length} sem resultado ·{" "}
              {lastBatch.filter((item) => item.matchStatus === "error").length} erros
            </div>
          </div>

          <div className="space-y-3">
            {lastBatch.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-[var(--surface2)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Produto pesquisado</p>
                    <p className="font-heading font-bold mt-1">{item.name}</p>
                  </div>
                  <span className={"inline-flex rounded-full border px-2 py-1 text-[10px] font-bold " + statusClass(item.matchStatus)}>
                    {statusLabel(item.matchStatus)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 mt-4">
                  <div>
                    <p className="text-xs text-[var(--muted)]">Anúncio selecionado</p>
                    <p className="text-sm font-medium mt-1">{item.matchedTitle || "Nenhum candidato selecionado"}</p>
                    {item.matchedUrl && (
                      <a
                        href={item.matchedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs text-[var(--amber)] hover:underline mt-1"
                      >
                        Abrir anúncio ↗
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Score</p>
                    <p className="text-lg font-display mt-1">{item.score == null ? "—" : item.score.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">Vendas</p>
                    <p className="text-lg font-display mt-1">
                      {item.soldQuantity == null ? "—" : item.soldQuantity.toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>

                {item.error && (
                  <div className="mt-3 rounded-lg border border-[var(--red)]/20 bg-[var(--red)]/5 px-3 py-2 text-xs text-[var(--red)]">
                    {item.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading font-bold">Resultados encontrados</h2>
          <p className="text-xs text-[var(--muted)] mt-1">{filteredMatches.length} registros exibidos</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="text-left border-b border-border text-[var(--muted)]">
                <th className="px-5 py-3">Produto pesquisado</th>
                <th className="px-4 py-3">Resultado Mercado Livre</th>
                <th className="px-4 py-3">Vendas</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3">Checado</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map((item) => (
                <tr key={item.id} className="border-b border-border/70 hover:bg-[var(--surface2)]">
                  <td className="px-5 py-4">
                    <p className="font-medium max-w-[320px]">{item.search_query}</p>
                  </td>
                  <td className="px-4 py-4">
                    {item.matched_title ? (
                      <>
                        <p className="font-medium max-w-[450px]">{item.matched_title}</p>
                        <p className="text-[10px] text-[var(--muted)] mt-1">{item.matched_item_id || "—"}</p>
                        {item.matched_url && (
                          <div className="flex gap-3 mt-2">
                            <a href={item.matched_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--amber)] hover:underline">
                              Abrir anúncio ↗
                            </a>
                            <button onClick={() => copy(item.matched_url || "")} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">
                              {copied === item.matched_url ? "Copiado" : "Copiar URL"}
                            </button>
                          </div>
                        )}
                        {item.candidate_data?.length > 1 && (
                          <details className="mt-2 text-xs">
                            <summary className="text-[var(--muted)] cursor-pointer">Ver alternativas</summary>
                            <div className="mt-2 space-y-2">
                              {item.candidate_data.slice(1, 5).map((candidate) => (
                                <div key={candidate.itemId} className="border-l border-border pl-3">
                                  <p>{candidate.title}</p>
                                  <p className="text-[10px] text-[var(--muted)]">{candidate.soldQuantity} vendidos · score {candidate.score.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </>
                    ) : (
                      <span className="text-[var(--muted)]">{item.error_message || "Nenhuma correspondência."}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-semibold">{item.sold_quantity == null ? "—" : item.sold_quantity.toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-4">{item.match_score == null ? "—" : item.match_score.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <span className={"inline-flex rounded-full border px-2 py-1 text-[10px] font-bold " + statusClass(item.match_status)}>
                      {statusLabel(item.match_status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)]">{formatDate(item.checked_at)}</td>
                </tr>
              ))}
              {!filteredMatches.length && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-[var(--muted)]">Nenhuma pesquisa concluída com esse filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-[var(--surface)] border border-border rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">Critério</p>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-5xl">
          O Mercado Livre permite ordenar buscas por quantidade vendida quando esse sort está disponível.
          A rotina ainda aplica uma pontuação de similaridade ao título e exige margem de segurança antes de chamar o resultado de confiável.
          Resultados ambíguos ficam disponíveis para revisão, em vez de alterar seu link de afiliado automaticamente.
        </p>
      </div>
    </div>
  );
}
