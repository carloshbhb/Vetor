"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Review } from "@/lib/types";

type StatusFilter = "all" | "published" | "draft";

export default function AdminLandingPagesPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      if (response.status === 401) {
        setError("Sua sessão expirou. Entre novamente no painel.");
        setItems([]);
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível carregar as landing pages.");
      }
      const body = await response.json();
      setItems(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar as landing pages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const matchesStatus = status === "all" || item.status === status;
      const matchesQuery = !normalized || [
        item.product, item.slug, item.category, item.meta_title,
      ].some((value) => String(value || "").toLocaleLowerCase("pt-BR").includes(normalized));
      return matchesStatus && matchesQuery;
    }).sort((a, b) => {
      const statusDiff = (a.status === "published" ? 0 : 1) - (b.status === "published" ? 0 : 1);
      return statusDiff || a.product.localeCompare(b.product, "pt-BR");
    });
  }, [items, query, status]);

  const changeStatus = async (item: Review, nextStatus: "published" | "draft") => {
    setBusySlug(item.slug);
    setError("");
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug, status: nextStatus }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível alterar o status.");
      setItems((current) => current.map((entry) =>
        entry.slug === item.slug ? { ...entry, status: nextStatus } : entry
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar o status.");
    } finally {
      setBusySlug(null);
    }
  };

  const deleteItem = async (item: Review) => {
    if (!window.confirm(`Excluir permanentemente a landing page "${item.product}"? Esta ação não pode ser desfeita.`)) return;
    setBusySlug(item.slug);
    setError("");
    try {
      const response = await fetch(`/api/admin/reviews?slug=${encodeURIComponent(item.slug)}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Não foi possível excluir a página.");
      setItems((current) => current.filter((entry) => entry.slug !== item.slug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir a página.");
    } finally {
      setBusySlug(null);
    }
  };

  const publishedCount = items.filter((item) => item.status === "published").length;
  const draftCount = items.length - publishedCount;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-border bg-[var(--surface)] p-6 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Gestão de páginas</span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Landing Pages</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Consulte páginas de produto, encontre rascunhos, confira os destinos públicos e controle a publicação em um só lugar.</p>
          </div>
          <a href="/admin/product-links-pending" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--amber)] px-4 py-3 text-sm font-bold text-white hover:opacity-90">Ver produtos pendentes</a>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Total de páginas</p>
          <p className="mt-2 font-display text-3xl font-black">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Publicadas</p>
          <p className="mt-2 font-display text-3xl font-black text-[var(--green)]">{publishedCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Rascunhos</p>
          <p className="mt-2 font-display text-3xl font-black text-[var(--amber)]">{draftCount}</p>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/10 p-4 text-sm text-[var(--red)]">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por produto, slug, categoria ou título SEO…"
            aria-label="Buscar landing pages"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--amber)]"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as StatusFilter)}
            aria-label="Filtrar por status"
            className="min-h-11 rounded-xl border border-border bg-[var(--bg)] px-3 text-sm text-[var(--text)]"
          >
            <option value="all">Todos os status</option>
            <option value="published">Publicadas</option>
            <option value="draft">Rascunhos</option>
          </select>
          <button onClick={() => void load()} disabled={loading} className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold hover:bg-[var(--surface2)] disabled:opacity-50">
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--muted)]">Carregando landing pages…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-bold">Nenhuma página encontrada</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Tente mudar a busca ou o filtro de status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-bold">Produto / slug</th>
                  <th className="px-4 py-3 font-bold">Categoria</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Preço</th>
                  <th className="px-4 py-3 text-right font-bold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.slug} className="border-t border-border hover:bg-[var(--surface2)]">
                    <td className="max-w-[360px] px-4 py-4">
                      <p className="font-bold text-[var(--text)]">{item.product}</p>
                      <p className="mt-1 break-all text-xs text-[var(--muted)]">/{item.slug}/</p>
                      {item.meta_title && <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">SEO: {item.meta_title}</p>}
                    </td>
                    <td className="px-4 py-4 text-[var(--text)]">{item.category || "Sem categoria"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status === "published" ? "bg-[var(--green)]/10 text-[var(--green)]" : "bg-[var(--amber)]/10 text-[var(--amber)]"}`}>
                        {item.status === "published" ? "Publicada" : "Rascunho"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--text)]">{item.price_new || "Consulte o preço"}</td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[190px] flex-wrap justify-end gap-3">
                        {item.status === "published" && <a className="text-xs font-bold text-[var(--text)] underline underline-offset-4" href={`/reviews/${encodeURIComponent(item.slug)}/`} target="_blank" rel="noreferrer">Abrir página</a>}
                        {item.status === "draft" ? (
                          <button disabled={busySlug === item.slug} onClick={() => void changeStatus(item, "published")} className="text-xs font-bold text-[var(--green)] hover:underline disabled:opacity-50">{busySlug === item.slug ? "Salvando…" : "Publicar"}</button>
                        ) : (
                          <button disabled={busySlug === item.slug} onClick={() => void changeStatus(item, "draft")} className="text-xs font-bold text-[var(--amber)] hover:underline disabled:opacity-50">{busySlug === item.slug ? "Salvando…" : "Tornar rascunho"}</button>
                        )}
                        <button disabled={busySlug === item.slug} onClick={() => void deleteItem(item)} className="text-xs font-bold text-[var(--red)] hover:underline disabled:opacity-50">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border px-4 py-3 text-xs text-[var(--muted)]">Exibindo {filtered.length} de {items.length} registros. A lista usa o inventário editorial já existente no Supabase; não cria uma tabela paralela.</div>
      </section>
    </div>
  );
}
