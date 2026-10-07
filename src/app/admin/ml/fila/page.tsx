"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type QueueRow = {
  id: string;
  affiliate_link_id: string;
  search_query: string;
  matched_item_id: string | null;
  matched_title: string | null;
  matched_url: string | null;
  sold_quantity: number | null;
  match_score: number | null;
  match_status: "matched" | "review";
  checked_at: string | null;
  affiliate_generation_status: "pending" | "generated" | "applied" | "skipped";
  generated_affiliate_url: string | null;
  generated_at: string | null;
  generation_notes: string | null;
  affiliate_links?: { name?: string; category?: string; marketplace?: string } | null;
};

const LABELS: Record<QueueRow["affiliate_generation_status"], string> = {
  pending: "Pendente",
  generated: "Gerado",
  applied: "Aplicado",
  skipped: "Ignorado",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function badge(status: QueueRow["affiliate_generation_status"]) {
  if (status === "applied" || status === "generated") return "text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20";
  if (status === "pending") return "text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20";
  return "text-[var(--muted)] bg-[var(--surface2)] border-border";
}

export default function MercadoLivreAffiliateQueuePage() {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setError("");
      const qs = status ? "?status=" + encodeURIComponent(status) : "";
      const response = await fetch("/api/admin/mercadolivre/affiliate-queue" + qs, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a fila.");
      setRows(payload.data || []);
      setCounts(payload.counts || {});
      setDrafts((previous) => {
        const next = { ...previous };
        for (const row of payload.data || []) if (next[row.id] === undefined) next[row.id] = row.generated_affiliate_url || "";
        return next;
      });
      setNotes((previous) => {
        const next = { ...previous };
        for (const row of payload.data || []) if (next[row.id] === undefined) next[row.id] = row.generation_notes || "";
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a fila.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const save = async (row: QueueRow, nextStatus?: QueueRow["affiliate_generation_status"]) => {
    setSaving(row.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/mercadolivre/affiliate-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          affiliateGenerationStatus: nextStatus,
          generatedAffiliateUrl: drafts[row.id] || null,
          generationNotes: notes[row.id] || null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar.");
      setNotice("Fila atualizada.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(null);
    }
  };

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(message);
    } catch {
      setError("Não foi possível copiar.");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.search_query, row.matched_title || "", row.matched_item_id || "", row.affiliate_links?.name || ""].join(" ").toLowerCase().includes(q));
  }, [rows, search]);

  if (loading) return <div className="py-20 text-center text-[var(--muted)]">Carregando fila de afiliados...</div>;

  return (
    <div>
      <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
        <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Operação comercial</span>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Fila de geração de links</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted)]">Converta os anúncios aprovados em links oficiais de afiliado. O destino só é aplicado à Central quando você marcar o item como aplicado.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]"><a href="/admin/ml" className="rounded-full border border-border bg-[var(--surface2)] px-3 py-1.5">← Voltar à pesquisa</a><span className="rounded-full border border-border bg-[var(--surface2)] px-3 py-1.5">Cole → valide → aplique</span></div>
      </header>

      {error && <div className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 text-[var(--red)] px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 text-[var(--green)] px-4 py-3 text-sm">{notice}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ["Pendentes", counts.pending || 0],
          ["Gerados", counts.generated || 0],
          ["Aplicados", counts.applied || 0],
          ["Ignorados", counts.skipped || 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--surface)] border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-display text-[var(--amber)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-2xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Produto, título ou item ID..." className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--amber)]" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm">
            <option value="">Todos</option><option value="pending">Pendentes</option><option value="generated">Gerados</option><option value="applied">Aplicados</option><option value="skipped">Ignorados</option>
          </select>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border"><h2 className="font-heading font-bold">Itens da fila</h2><p className="text-xs text-[var(--muted)] mt-1">{filtered.length} registros exibidos</p></div>
        <div className="divide-y divide-border">
          {filtered.map((row) => {
            const generated = drafts[row.id] || "";
            return (
              <div key={row.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--muted)]">{row.affiliate_links?.category || "Mercado Livre"}</p>
                    <h3 className="font-heading font-bold mt-1">{row.affiliate_links?.name || row.search_query}</h3>
                    <p className="text-xs text-[var(--muted)] mt-1">{row.matched_item_id || "item não identificado"} · {row.sold_quantity == null ? "vendas não informadas" : row.sold_quantity.toLocaleString("pt-BR") + " vendidos"} · score {row.match_score == null ? "—" : row.match_score.toFixed(2)}</p>
                    {row.matched_title && <p className="text-sm mt-3">{row.matched_title}</p>}
                    {row.matched_url && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        <a href={row.matched_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--amber)] hover:underline">Abrir anúncio ↗</a>
                        <button onClick={() => copy(row.matched_url || "", "URL do anúncio copiada.")} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Copiar anúncio</button>
                        <button onClick={() => copy(row.matched_url || "", "URL copiada para usar no Gerador de Links.")} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Usar no Gerador</button>
                      </div>
                    )}
                  </div>
                  <span className={"inline-flex rounded-full border px-2 py-1 text-[10px] font-bold " + badge(row.affiliate_generation_status)}>{LABELS[row.affiliate_generation_status]}</span>
                </div>

                <div className="mt-5 grid lg:grid-cols-[1fr_280px] gap-4">
                  <label className="text-xs text-[var(--muted)]">
                    Link oficial de afiliado gerado no Mercado Livre
                    <input value={generated} onChange={(e) => setDrafts({ ...drafts, [row.id]: e.target.value })} placeholder="Cole aqui o link gerado pelo Portal de Afiliados" className="mt-1 w-full bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm text-[var(--text)] font-mono" />
                  </label>
                  <label className="text-xs text-[var(--muted)]">
                    Observação
                    <input value={notes[row.id] || ""} onChange={(e) => setNotes({ ...notes, [row.id]: e.target.value })} placeholder="Ex.: campanha 2026-10" className="mt-1 w-full bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm" />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button onClick={() => save(row)} disabled={saving === row.id} className="bg-[var(--amber)] text-black font-heading font-extrabold px-4 py-2.5 rounded-xl disabled:opacity-50">{saving === row.id ? "Salvando..." : "Salvar"}</button>
                  <button onClick={() => save(row, "generated")} disabled={saving === row.id || !generated} className="border border-border px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">Marcar como gerado</button>
                  <button onClick={() => save(row, "applied")} disabled={saving === row.id || !generated} className="border border-[var(--green)]/30 text-[var(--green)] px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">Marcar aplicado</button>
                  <button onClick={() => save(row, "skipped")} disabled={saving === row.id} className="text-xs text-[var(--muted)] hover:underline">Ignorar</button>
                  <span className="text-[10px] text-[var(--muted)] ml-auto">Checado: {formatDate(row.checked_at)}</span>
                </div>
              </div>
            );
          })}
          {!filtered.length && <div className="px-5 py-14 text-center text-[var(--muted)]">Não há itens nesta fila. Execute primeiro a pesquisa dos anúncios no Mercado Livre.</div>}
        </div>
      </div>

      <div className="mt-6 bg-[var(--surface)] border border-border rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">Processo oficial</p>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-5xl">
          Abra o anúncio, copie a URL e use o Gerador de Links do Portal de Afiliados. Depois cole o link retornado aqui.
        </p>
      </div>
    </div>
  );
}
