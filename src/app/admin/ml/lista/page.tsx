"use client";

import { useCallback, useEffect, useState } from "react";

type SocialItem = {
  item_id: string;
  product_id: string | null;
  title: string;
  product_url: string;
  image_url: string | null;
  price: number | null;
  original_price: number | null;
  rating: number | null;
  review_count: number | null;
  highlight: string | null;
  page_number: number;
};

type SyncSummary = {
  expected_total: number | null;
  fetched_total: number;
  unique_total: number;
  missing_total: number | null;
  pages_scanned: number;
  status: "running" | "complete" | "partial" | "error";
  error_message?: string | null;
  started_at: string;
  finished_at: string | null;
};

type ListResponse = {
  items: SocialItem[];
  total: number;
  page: number;
  limit: number;
  sync: SyncSummary | null;
};

function money(value: number | null) {
  if (value == null) return "Preço indisponível";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function date(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("pt-BR");
}

export default function MercadoLivreSocialListPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (nextPage = 1, q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "50" });
      if (q.trim()) params.set("q", q.trim());
      const response = await fetch("/api/admin/mercadolivre/social-list?" + params.toString(), { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a lista.");
      setData(payload);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar a lista.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(1, ""); }, [load]);

  const sync = async () => {
    setSyncing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/mercadolivre/social-list", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Falha ao sincronizar a lista.");
      setNotice(payload.message || "Sincronização concluída.");
      setPage(1);
      await load(1, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na sincronização.");
    } finally {
      setSyncing(false);
    }
  };

  const recoverMissing = async () => {
    setRecovering(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/mercadolivre/social-list/recover", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Não foi possível recuperar os produtos ausentes.");
      setNotice(payload.message || "Recuperação da lista concluída.");
      setPage(1);
      await load(1, search);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao recuperar os produtos ausentes.");
    } finally {
      setRecovering(false);
    }
  };

  const importToQueue = async () => {
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/mercadolivre/social-list/import", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível enviar os produtos à fila.");
      setNotice(payload.message || "Produtos enviados à fila de pesquisa.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar produtos à fila.");
    } finally {
      setImporting(false);
    }
  };

  const syncStatus = data?.sync?.status;
  const hasSync = Boolean(data?.sync);
  const expected = data?.sync?.expected_total ?? null;
  const imported = data?.sync?.unique_total ?? data?.total ?? 0;
  const missing = data?.sync?.missing_total ?? (expected == null ? null : Math.max(0, expected - imported));
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 50));

  return (
    <main className="space-y-6">
      <header className="rounded-2xl border border-border bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.15em] text-[var(--amber)]">Catálogo de origem</span>
            <h1 className="mt-3 font-display text-3xl font-black">Lista pública do Mercado Livre</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Importa os produtos publicados no perfil social Vetor Blog. Os registros ficam separados da Central de Afiliados: a importação não substitui destinos nem cria links de afiliado automaticamente.
            </p>
            <a className="mt-3 inline-block text-xs font-bold text-[var(--amber)] hover:underline" href="https://www.mercadolivre.com.br/social/carloshbhb/lists/870a18f7-4b8b-422b-b3e1-043d83e0c314" target="_blank" rel="noreferrer">
              Abrir lista pública no Mercado Livre ↗
            </a>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={sync} disabled={syncing || importing || recovering} className="rounded-xl bg-[var(--amber)] px-5 py-3 text-sm font-extrabold text-black disabled:opacity-50">
              {syncing ? "Sincronizando lista..." : "Sincronizar produtos"}
            </button>
            <button onClick={recoverMissing} disabled={recovering || syncing || importing || missing === 0 || missing == null} className="rounded-xl border border-[var(--amber)]/50 bg-[var(--amber-bg)] px-5 py-3 text-sm font-bold text-[var(--amber)] disabled:opacity-50">
              {recovering ? "Consultando API oficial..." : "Completar itens ausentes via API"}
            </button>
            <button onClick={importToQueue} disabled={importing || syncing || recovering || !data?.total} className="rounded-xl border border-border bg-[var(--surface2)] px-5 py-3 text-sm font-bold disabled:opacity-50">
              {importing ? "Enviando à fila..." : "Enviar à fila de pesquisa"}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 px-4 py-3 text-sm text-[var(--red)]">{error}</div>}
      {notice && <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 px-4 py-3 text-sm text-[var(--green)]">{notice}</div>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs text-[var(--muted)]">Produtos importados</p>
          <strong className="mt-1 block text-2xl font-display text-[var(--amber)]">{imported}</strong>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs text-[var(--muted)]">Total informado pelo ML</p>
          <strong className="mt-1 block text-2xl font-display">{expected ?? "—"}</strong>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs text-[var(--muted)]">Não retornados pela página</p>
          <strong className="mt-1 block text-2xl font-display text-[var(--amber)]">{missing ?? "—"}</strong>
        </div>
        <div className="rounded-2xl border border-border bg-[var(--surface)] p-5">
          <p className="text-xs text-[var(--muted)]">Páginas lidas</p>
          <strong className="mt-1 block text-2xl font-display">{data?.sync?.pages_scanned ?? "—"}</strong>
        </div>
      </section>

      {!hasSync && (
        <section className="rounded-xl border border-border bg-[var(--surface2)] p-4">
          <p className="text-sm font-bold">Aguardando a primeira sincronização</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            O Mercado Livre informa 287 produtos na lista pública, mas o catálogo ainda não foi lido nesta instalação. Clique em “Sincronizar produtos” para medir quantos registros a página realmente disponibiliza.
          </p>
        </section>
      )}

      {syncStatus === "partial" && (
        <section className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-4">
          <p className="text-sm font-bold text-[var(--amber)]">Sincronização parcial — não considerar os 287 itens concluídos</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            O contador público informa {expected} resultados. O catálogo HTML e a recuperação pela API oficial já registraram {imported} produtos; {missing} ainda precisam de resolução. Registros recuperados pela API ficam identificados individualmente. Última leitura: {date(data?.sync?.finished_at || null)}.
          </p>
        </section>
      )}

      {syncStatus === "complete" && (
        <section className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4 text-sm text-[var(--green)]">
          Lista completa: {imported} de {expected} produtos registrados, incluindo itens recuperados pela API oficial quando necessário. Última leitura: {date(data?.sync?.finished_at || null)}.
        </section>
      )}

      <section className="rounded-2xl border border-border bg-[var(--surface)] p-4">
        <form onSubmit={(event) => { event.preventDefault(); setSearch(query); void load(1, query); }} className="flex flex-col gap-2 sm:flex-row">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto na lista..." className="min-w-0 flex-1 rounded-xl border border-border bg-[var(--surface2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--amber)]" />
          <button type="submit" className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold">Buscar</button>
          <button type="button" onClick={() => { setQuery(""); setSearch(""); void load(1, ""); }} className="rounded-xl border border-border px-4 py-2.5 text-sm">Limpar</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold">Produtos encontrados</h2>
            <p className="text-xs text-[var(--muted)]">{data?.total ?? 0} registros nesta visualização</p>
          </div>
          <span className="text-xs text-[var(--muted)]">Origem: lista social · MLB</span>
        </div>

        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-[var(--muted)]">Carregando produtos...</p>
        ) : !data?.items.length ? (
          <p className="px-5 py-12 text-center text-sm text-[var(--muted)]">Nenhum produto importado. Clique em “Sincronizar produtos”.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map((item) => (
              <article key={item.item_id} className="flex gap-4 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-[var(--surface2)]">
                  {item.image_url && <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-contain" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold leading-5">{item.title}</h3>
                    {item.highlight && <span className="rounded-full bg-[var(--amber-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--amber)]">{item.highlight}</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">{item.item_id}{item.product_id ? " · catálogo " + item.product_id : ""} · {item.page_number === 0 ? "complementado fora da paginação" : "página " + item.page_number}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <strong>{money(item.price)}</strong>
                    {item.original_price != null && item.original_price > (item.price || 0) && <span className="text-[var(--muted)] line-through">{money(item.original_price)}</span>}
                    {item.rating != null && <span>★ {item.rating.toFixed(1)}{item.review_count != null ? " (" + item.review_count.toLocaleString("pt-BR") + ")" : ""}</span>}
                    <a href={item.product_url} target="_blank" rel="noreferrer" className="font-bold text-[var(--amber)] hover:underline">Abrir produto ↗</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <button onClick={() => void load(Math.max(1, page - 1), search)} disabled={page <= 1 || loading} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-40">← Anterior</button>
          <span className="text-xs text-[var(--muted)]">Página {page} de {pages}</span>
          <button onClick={() => void load(Math.min(pages, page + 1), search)} disabled={page >= pages || loading} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-40">Próxima →</button>
        </div>
      </section>
    </main>
  );
}
