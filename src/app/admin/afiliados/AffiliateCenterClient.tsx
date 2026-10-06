"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "active" | "paused" | "broken" | "archived";
type SourceType = "review" | "comparison_product" | "product_link" | "manual";
type Health = "unknown" | "healthy" | "redirect" | "error";

type LinkRow = {
  id: string; slug: string; name: string; marketplace: string; category: string;
  source_type: SourceType; source_ref: string; destination_url: string; product_url: string;
  affiliate_tag: string; affiliate_checked_at: string | null; image_url: string; price: number | null;
  status: Status; priority: number; notes: string; tags: string[];
  health_status: Health; last_checked_at: string | null; http_status: number | null;
  total_clicks: number; last_clicked_at: string | null; created_at: string; updated_at: string;
};

type Stats = { total: number; active: number; paused: number; broken: number; archived: number; unchecked: number; healthErrors: number; clicks: number; };
type FormData = Pick<LinkRow, "slug"|"name"|"marketplace"|"category"|"source_type"|"source_ref"|"destination_url"|"product_url"|"affiliate_tag"|"affiliate_checked_at"|"image_url"|"price"|"status"|"priority"|"notes"|"tags">;

type Props = {
  initialLinks: LinkRow[];
  initialTotal: number;
  initialStats: Stats;
  initialMarketplaces: string[];
  generatedAt: string;
};

const EMPTY: FormData = {
  slug: "", name: "", marketplace: "Mercado Livre", category: "", source_type: "manual",
  source_ref: "", destination_url: "", product_url: "", affiliate_tag: "", affiliate_checked_at: null,
  image_url: "", price: null, status: "active", priority: 100, notes: "", tags: []
};

const SOURCE_LABEL: Record<SourceType, string> = {
  review: "Review", comparison_product: "Comparativo", product_link: "Legado", manual: "Manual"
};
const STATUS_LABEL: Record<Status, string> = {
  active: "Ativo", paused: "Pausado", broken: "Com problema", archived: "Arquivado"
};
const HEALTH_LABEL: Record<Health, string> = {
  unknown: "Não verificado", healthy: "OK", redirect: "Redirecionando", error: "Erro"
};

function date(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function host(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); }
  catch { return value.slice(0, 40); }
}

function tone(value: Status | Health) {
  if (value === "active" || value === "healthy") return "border-[var(--green)]/20 bg-[var(--green)]/10 text-[var(--green)]";
  if (value === "paused" || value === "redirect") return "border-[var(--amber)]/20 bg-[var(--amber)]/10 text-[var(--amber)]";
  if (value === "broken" || value === "error") return "border-[var(--red)]/20 bg-[var(--red)]/10 text-[var(--red)]";
  return "border-border bg-[var(--surface)] text-[var(--muted)]";
}

export default function AffiliateCenterClient({ initialLinks, initialTotal, initialStats, initialMarketplaces, generatedAt }: Props) {
  const [links, setLinks] = useState(initialLinks);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [marketplaces, setMarketplaces] = useState(initialMarketplaces);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [marketplace, setMarketplace] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [health, setHealth] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<LinkRow | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [lastRead, setLastRead] = useState(generatedAt);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError("");
      const qs = new URLSearchParams({ limit: "50", offset: String(page * 50) });
      if (search.trim()) qs.set("search", search.trim());
      if (status) qs.set("status", status);
      if (marketplace) qs.set("marketplace", marketplace);
      if (sourceType) qs.set("source_type", sourceType);
      if (health) qs.set("health_status", health);
      const res = await fetch("/api/admin/affiliates?" + qs.toString(), { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Não foi possível carregar os links.");
      setLinks(payload.data || []);
      setTotal(Number(payload.total || 0));
      if (payload.stats) setStats(payload.stats);
      if (payload.marketplaces) setMarketplaces(payload.marketplaces);
      if (payload.generatedAt) setLastRead(payload.generatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, marketplace, sourceType, health]);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (page === 0 && !search && !status && !marketplace && !sourceType && !health) return; void load(); }, 250);
    return () => window.clearTimeout(timer);
  }, [load, page, search, status, marketplace, sourceType, health]);

  const filteredCountLabel = useMemo(() => {
    if (loading) return "Atualizando…";
    return total + " link(s) encontrados";
  }, [loading, total]);

  const activeFilters = [search, status, marketplace, sourceType, health].filter(Boolean).length;

  const resetFilters = () => {
    setSearch(""); setStatus(""); setMarketplace(""); setSourceType(""); setHealth(""); setPage(0);
    window.setTimeout(() => void load(), 20);
  };

  const openNew = () => {
    setEditing(null); setForm(EMPTY); setShowModal(true); setNotice(""); setError("");
  };

  const openEdit = (item: LinkRow) => {
    setEditing(item);
    setForm({
      slug: item.slug, name: item.name, marketplace: item.marketplace, category: item.category,
      source_type: item.source_type, source_ref: item.source_ref, destination_url: item.destination_url,
      product_url: item.product_url || "", affiliate_tag: item.affiliate_tag || "",
      affiliate_checked_at: item.affiliate_checked_at, image_url: item.image_url || "", price: item.price,
      status: item.status, priority: item.priority, notes: item.notes, tags: item.tags
    });
    setShowModal(true); setNotice(""); setError("");
  };

  const syncContent = async () => {
    setSyncing(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/affiliates/sync", { method: "POST", cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Não foi possível sincronizar.");
      setNotice(payload.message || "Sincronização concluída.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao sincronizar.");
    } finally { setSyncing(false); }
  };

  const lookup = async () => {
    setLookingUp(true); setError("");
    try {
      const res = await fetch("/api/admin/affiliates/lookup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_url: form.product_url })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Não foi possível consultar o catálogo.");
      setForm((current) => ({
        ...current,
        name: current.name || payload.data?.name || "",
        slug: current.slug || String(payload.data?.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        category: current.category || payload.data?.category || "",
        product_url: payload.data?.product_url || current.product_url,
        image_url: payload.data?.image_url || current.image_url,
        price: payload.data?.price ?? current.price
      }));
      setNotice("Dados do catálogo preenchidos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no catálogo.");
    } finally { setLookingUp(false); }
  };

  const save = async () => {
    if (!form.name.trim() || !form.destination_url.trim()) {
      setError("Nome e URL oficial de afiliado são obrigatórios."); return;
    }
    try {
      new URL(form.destination_url);
      if (form.destination_url.trim().toLowerCase().indexOf("https://") !== 0) throw new Error();
      if (form.product_url) { if (new URL(form.product_url).protocol !== "https:") throw new Error("produto"); }
      if (form.image_url) { if (new URL(form.image_url).protocol !== "https:") throw new Error("imagem"); }
    } catch (e) {
      setError(e instanceof Error && e.message === "produto" ? "URL do produto precisa ser HTTPS." : e instanceof Error && e.message === "imagem" ? "URL da imagem precisa ser HTTPS." : "O destino precisa ser uma URL HTTPS válida.");
      return;
    }

    setSaving(true); setError(""); setNotice("");
    try {
      const endpoint = editing ? "/api/admin/affiliates/" + editing.id : "/api/admin/affiliates";
      const res = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Não foi possível salvar.");
      setNotice(editing ? "Link atualizado." : "Link criado.");
      setShowModal(false); setEditing(null); setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally { setSaving(false); }
  };

  const archive = async (item: LinkRow) => {
    if (!window.confirm('Arquivar o link "' + item.name + '"?')) return;
    try {
      const res = await fetch("/api/admin/affiliates/" + item.id, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Não foi possível arquivar.");
      setNotice("Link arquivado."); await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao arquivar.");
    }
  };

  const check = async (ids?: string[]) => {
    setChecking(true); setError("");
    try {
      let checked = 0;
      if (ids) {
        const res = await fetch("/api/admin/affiliates/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "Falha na verificação.");
        checked = Number(payload.checked || 0);
      } else {
        const all: string[] = [];
        let offset = 0, activeTotal = 0;
        do {
          const res = await fetch("/api/admin/affiliates?status=active&limit=200&offset=" + offset, { cache: "no-store" });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload.error || "Falha ao listar ativos.");
          all.push(...(payload.data || []).map((x: LinkRow) => x.id));
          activeTotal = Number(payload.total || 0);
          offset += 200;
        } while (offset < activeTotal);
        for (let i = 0; i < all.length; i += 50) {
          const batch = all.slice(i, i + 50);
          const res = await fetch("/api/admin/affiliates/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: batch }) });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(payload.error || "Falha ao testar ativos.");
          checked += Number(payload.checked || 0);
          setNotice("Verificados " + checked + " de " + all.length + " ativos…");
        }
      }
      setNotice(checked ? checked + " link(s) verificado(s)." : "Nenhum link elegível.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na verificação.");
    } finally { setChecking(false); }
  };

  const copyPath = async (slug: string) => {
    try {
      await navigator.clipboard.writeText("/go/" + slug + "/");
      setCopied(slug);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Não foi possível copiar.");
    }
  };

  const clearModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY); };

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--amber)]/25 bg-[var(--amber)]/10 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-[var(--amber)]">Comercial</span>
              <span className="rounded-full border border-border bg-[var(--surface)] px-2.5 py-1 text-[var(--muted)]">Fonte única: public.affiliate_links</span>
            </div>
            <h1 className="font-display mt-3 text-4xl sm:text-5xl">Links de afiliado</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Um único lugar para trocar destinos comerciais, acompanhar saúde e editar ofertas sem alterar os artigos publicados.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void syncContent()} disabled={syncing} className="rounded-xl border border-border bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface2)] disabled:opacity-50">{syncing ? "Sincronizando…" : "Sincronizar conteúdo"}</button>
            <a href="/admin/ml" className="rounded-xl border border-border bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface2)]">Mercado Livre</a>
            <a href="/admin/monetizacao" className="rounded-xl border border-border bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface2)]">Cliques</a>
            <button onClick={openNew} className="rounded-xl bg-[var(--amber)] px-4 py-2.5 text-sm font-extrabold text-black hover:bg-white">+ Novo link</button>
          </div>
        </div>
      </header>

      {error && <div className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 px-4 py-3 text-sm text-[var(--red)]">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 px-4 py-3 text-sm text-[var(--green)]">{notice}</div>}

      <section className="mb-6 rounded-2xl border border-border bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--amber)]">Registro central</p>
            <div className="mt-1 flex items-baseline gap-2"><strong className="font-display text-4xl">{total}</strong><span className="text-sm text-[var(--muted)]">links reais no banco central</span></div>
            <p className="mt-1 text-xs text-[var(--muted)]">Leitura {date(lastRead)} · nenhum contador de inventário antigo.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Ativos", stats.active], ["Problemas", stats.broken + stats.healthErrors],
              ["Não verificados", stats.unchecked], ["Cliques", stats.clicks]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-[var(--surface2)] px-3 py-2.5 min-w-[112px]">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
                <p className="mt-1 text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-[var(--surface)] p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1.8fr)_repeat(4,minmax(150px,1fr))_auto] gap-3">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Produto, slug, categoria, origem ou observação…" className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-sm outline-none focus:border-[var(--amber)]" />
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="rounded-xl border border-border bg-[var(--surface2)] px-3 py-3 text-sm"><option value="">Todos os status</option><option value="active">Ativos</option><option value="paused">Pausados</option><option value="broken">Com problema</option><option value="archived">Arquivados</option></select>
          <select value={marketplace} onChange={(e) => { setMarketplace(e.target.value); setPage(0); }} className="rounded-xl border border-border bg-[var(--surface2)] px-3 py-3 text-sm"><option value="">Todos os marketplaces</option>{Array.from(new Set([...["Mercado Livre","Amazon","Shopee","Magazine Luiza","Multi","Outro"], ...marketplaces])).map((m) => <option key={m}>{m}</option>)}</select>
          <select value={sourceType} onChange={(e) => { setSourceType(e.target.value); setPage(0); }} className="rounded-xl border border-border bg-[var(--surface2)] px-3 py-3 text-sm"><option value="">Todas as origens</option><option value="review">Reviews</option><option value="comparison_product">Comparativos</option><option value="product_link">Legado</option><option value="manual">Manuais</option></select>
          <select value={health} onChange={(e) => { setHealth(e.target.value); setPage(0); }} className="rounded-xl border border-border bg-[var(--surface2)] px-3 py-3 text-sm"><option value="">Toda saúde</option><option value="unknown">Não verificados</option><option value="healthy">OK</option><option value="redirect">Redirecionando</option><option value="error">Erro</option></select>
          <button onClick={resetFilters} disabled={!activeFilters} className="rounded-xl border border-border px-3 py-3 text-sm font-semibold text-[var(--muted)] disabled:opacity-35">Limpar</button>
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted)]"><span>{filteredCountLabel}{activeFilters ? " · " + activeFilters + " filtro(s)" : ""}</span><span>{stats.archived} arquivado(s)</span></div>
      </section>

      <section className="rounded-2xl border border-border bg-[var(--surface)]">
        <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="font-heading text-lg font-bold">Ofertas cadastradas</h2><p className="mt-1 text-xs text-[var(--muted)]">Edite aqui. As páginas públicas continuam usando a rota estável /go/.</p></div>
          <button onClick={() => void check()} disabled={checking || stats.active === 0} className="rounded-lg border border-border px-3 py-2 text-xs font-bold disabled:opacity-50">{checking ? "Verificando…" : "Testar links ativos"}</button>
        </div>

        <div className="grid gap-3 p-3 sm:p-4 xl:grid-cols-2">
          {links.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-[var(--surface2)] p-4 hover:border-[var(--amber)]/30">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <span className={"rounded-full border px-2 py-1 text-[10px] font-bold " + tone(item.status)}>{STATUS_LABEL[item.status]}</span>
                    <span className={"rounded-full border px-2 py-1 text-[10px] font-bold " + tone(item.health_status)}>{HEALTH_LABEL[item.health_status]}{item.http_status ? " · " + item.http_status : ""}</span>
                  </div>
                  <h3 className="mt-2 line-clamp-2 font-heading text-base font-bold">{item.name}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">{SOURCE_LABEL[item.source_type]} · {item.marketplace} · {item.category || "sem categoria"}</p>
                </div>
                <div className="shrink-0 rounded-xl border border-border bg-[var(--surface)] px-3 py-2 text-right">
                  <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Cliques</span>
                  <strong className="mt-1 block text-lg">{item.total_clicks}</strong>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-[var(--surface)] p-3">
                <p className="text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Rota pública</p>
                <p className="mt-1 font-mono text-xs break-all">/go/{item.slug}/</p>
                <p className="mt-1 truncate text-[11px] text-[var(--muted)]">{host(item.destination_url)}</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">
                <div><span className="text-[9px] uppercase tracking-[0.12em]">Checagem</span><strong className="mt-1 block text-[var(--text)]">{date(item.last_checked_at)}</strong></div>
                <div><span className="text-[9px] uppercase tracking-[0.12em]">Atualizado</span><strong className="mt-1 block text-[var(--text)]">{date(item.updated_at)}</strong></div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openEdit(item)} className="rounded-lg bg-[var(--amber)] px-3 py-2 text-xs font-extrabold text-black">Editar oferta</button>
                <button onClick={() => void check([item.id])} disabled={checking} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50">Testar</button>
                <button onClick={() => void copyPath(item.slug)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">{copied === item.slug ? "Copiado" : "Copiar /go/"}</button>
                {item.status !== "archived" && <button onClick={() => void archive(item)} className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-[var(--red)]">Arquivar</button>}
              </div>
            </article>
          ))}

          {!links.length && (
            <div className="col-span-full px-5 py-16 text-center">
              <p className="font-heading text-lg font-bold">Nenhum link encontrado</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Ajuste os filtros ou cadastre uma nova oferta.</p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-4 flex items-center justify-between">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-35">← Anterior</button>
        <span className="text-xs text-[var(--muted)]">Página {total ? page + 1 : 0} de {Math.max(1, Math.ceil(total / 50))}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={loading || (page + 1) * 50 >= total} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-35">Próxima →</button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-[var(--surface)] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--amber)]">Fluxo</p><h2 className="mt-1 font-heading font-bold">Uma fonte para o comercial</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">O editorial não precisa ser alterado quando a URL de afiliado muda. A operação acontece neste registro.</p></section>
        <section className="rounded-2xl border border-border bg-[var(--surface)] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--amber)]">Dados</p><h2 className="mt-1 font-heading font-bold">Priorize o que importa</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{stats.clicks ? "Os cliques ajudam a priorizar produtos com maior intenção comercial." : "Os cliques serão registrados por link e campanha conforme o tráfego chegar."}</p></section>
        <section className="rounded-2xl border border-border bg-[var(--surface)] p-5"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--amber)]">Mercado Livre</p><h2 className="mt-1 font-heading font-bold">Ferramentas no mesmo fluxo</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">A busca e a fila ficam como ferramentas operacionais; o destino publicado permanece na Central.</p><div className="mt-3 flex gap-2"><a href="/admin/ml" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Pesquisar</a><a href="/admin/ml/fila" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Fila</a></div></section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/65 p-3 sm:p-5 flex items-center justify-center">
          <div className="w-full max-w-4xl max-h-[94vh] overflow-hidden rounded-2xl border border-border bg-[var(--bg)] flex flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--amber)]">{editing ? "Editar oferta" : "Novo link de afiliado"}</p><h2 className="mt-1 font-display text-2xl">{editing ? editing.name : "Nova oferta"}</h2></div>
              <button onClick={clearModal} className="rounded-lg px-2 py-1 text-2xl text-[var(--muted)]" aria-label="Fechar">×</button>
            </div>
            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/5 p-4"><p className="text-xs font-bold text-[var(--amber)]">Regra da Central</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Cole aqui exatamente o link oficial de afiliado. O site público usa apenas /go/{form.slug || "seu-slug"}/.</p></div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-[var(--muted)]">Nome do produto *
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm" />
                </label>
                <label className="text-xs text-[var(--muted)]">Slug /go/
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 font-mono text-sm" />
                </label>
              </div>

              <label className="mt-4 block text-xs text-[var(--muted)]">URL oficial de afiliado *
                <input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value, affiliate_checked_at: null })} placeholder="https://..." className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 font-mono text-xs" />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-[var(--muted)]">URL do produto
                  <input value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} placeholder="Página pública do Mercado Livre" className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm" />
                </label>
                <div className="flex items-end"><button type="button" onClick={() => void lookup()} disabled={lookingUp || !form.product_url.trim()} className="w-full rounded-xl border border-border px-3 py-2.5 text-xs font-bold disabled:opacity-50">{lookingUp ? "Consultando…" : "Preencher do catálogo"}</button></div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="text-xs text-[var(--muted)]">Marketplace
                  <select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm">{Array.from(new Set(["Mercado Livre","Amazon","Shopee","Magazine Luiza","Multi","Outro",...marketplaces])).map((m) => <option key={m}>{m}</option>)}</select>
                </label>
                <label className="text-xs text-[var(--muted)]">Origem
                  <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value as SourceType })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm"><option value="review">Review</option><option value="comparison_product">Comparativo</option><option value="product_link">Legado</option><option value="manual">Manual</option></select>
                </label>
                <label className="text-xs text-[var(--muted)]">Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm"><option value="active">Ativo</option><option value="paused">Pausado</option><option value="broken">Com problema</option><option value="archived">Arquivado</option></select>
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-[var(--muted)]">Categoria<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm" /></label>
                <label className="text-xs text-[var(--muted)]">Referência de origem<input value={form.source_ref} onChange={(e) => setForm({ ...form, source_ref: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm" /></label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-xs text-[var(--muted)]">Etiqueta da Central<input maxLength={30} value={form.affiliate_tag} onChange={(e) => setForm({ ...form, affiliate_tag: e.target.value })} placeholder="site_review" className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm" /></label>
                <div className="rounded-xl border border-border bg-[var(--surface)] p-3 text-xs text-[var(--muted)]"><p>Destino conferido</p><strong className="mt-1 block text-[var(--text)]">{form.affiliate_checked_at ? date(form.affiliate_checked_at) : "Ainda não conferido"}</strong><button type="button" disabled={!form.destination_url.trim()} onClick={() => setForm({ ...form, affiliate_checked_at: new Date().toISOString() })} className="mt-2 rounded-lg border border-border px-3 py-2 font-bold disabled:opacity-50">Marcar como conferido</button></div>
              </div>

              <label className="mt-4 block text-xs text-[var(--muted)]">Tags<input value={form.tags.join(", ")} onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm" /></label>
              <label className="mt-4 block text-xs text-[var(--muted)]">Notas operacionais<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-[var(--surface)] px-3 py-2.5 text-sm resize-none" /></label>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
              <a href="https://www.mercadolivre.com.br/l/visite-o-portal-de-afiliados" target="_blank" rel="noreferrer" className="text-xs font-semibold text-[var(--amber)] hover:underline">Abrir Central de Afiliados ↗</a>
              <div className="flex gap-2"><button onClick={clearModal} className="rounded-xl px-4 py-2.5 text-sm text-[var(--muted)]">Cancelar</button><button onClick={() => void save()} disabled={saving} className="rounded-xl bg-[var(--amber)] px-5 py-2.5 text-sm font-extrabold text-black disabled:opacity-50">{saving ? "Salvando…" : "Salvar link"}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
