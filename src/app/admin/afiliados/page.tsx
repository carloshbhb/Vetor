"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "active" | "paused" | "broken" | "archived";
type SourceType = "review" | "comparison_product" | "product_link" | "manual";
type Health = "unknown" | "healthy" | "redirect" | "error";

type AffiliateLink = {
  id: string;
  slug: string;
  name: string;
  marketplace: string;
  category: string;
  source_type: SourceType;
  source_ref: string;
  destination_url: string;
  status: Status;
  priority: number;
  notes: string;
  tags: string[];
  health_status: Health;
  last_checked_at: string | null;
  http_status: number | null;
  final_url: string | null;
  last_error: string | null;
  total_clicks: number;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
};

type Stats = {
  total: number;
  active: number;
  paused: number;
  broken: number;
  archived: number;
  unchecked: number;
  clicks: number;
};

const EMPTY = {
  slug: "",
  name: "",
  marketplace: "Mercado Livre",
  category: "",
  source_type: "manual" as SourceType,
  source_ref: "",
  destination_url: "",
  status: "active" as Status,
  priority: 100,
  notes: "",
  tags: [] as string[],
};

const MARKETPLACES = ["Mercado Livre", "Amazon", "Shopee", "Magazine Luiza", "Multi", "Outro"];

const STATUS_LABEL: Record<Status, string> = {
  active: "Ativo",
  paused: "Pausado",
  broken: "Com problema",
  archived: "Arquivado",
};

const HEALTH_LABEL: Record<Health, string> = {
  unknown: "Não verificado",
  healthy: "OK",
  redirect: "Redirecionando",
  error: "Erro",
};

const SOURCE_LABEL: Record<SourceType, string> = {
  review: "Review",
  comparison_product: "Comparativo",
  product_link: "Product link",
  manual: "Manual",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function host(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.slice(0, 42);
  }
}

function badgeClass(status: Status | Health) {
  if (status === "active" || status === "healthy") return "text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/20";
  if (status === "paused" || status === "redirect") return "text-[var(--amber)] bg-[var(--amber)]/10 border-[var(--amber)]/20";
  if (status === "broken" || status === "error") return "text-[var(--red)] bg-[var(--red)]/10 border-[var(--red)]/20";
  return "text-[var(--muted)] bg-[var(--surface2)] border-border";
}

export default function AffiliateCenterPage() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, active: 0, paused: 0, broken: 0, archived: 0, unchecked: 0, clicks: 0,
  });
  const [marketplaces, setMarketplaces] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [marketplace, setMarketplace] = useState("");
  const [health, setHealth] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AffiliateLink | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (status) qs.set("status", status);
      if (marketplace) qs.set("marketplace", marketplace);
      if (health) qs.set("health_status", health);
      qs.set("limit", "200");
      const response = await fetch("/api/admin/affiliates?" + qs.toString(), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os links.");
      setLinks(payload.data || []);
      setStats(payload.stats || stats);
      setMarketplaces(payload.marketplaces || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [search, status, marketplace, health]);

  useEffect(() => {
    const timer = window.setTimeout(() => { load(); }, 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
    setError("");
  };

  const openEdit = (item: AffiliateLink) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      name: item.name,
      marketplace: item.marketplace,
      category: item.category,
      source_type: item.source_type,
      source_ref: item.source_ref,
      destination_url: item.destination_url,
      status: item.status,
      priority: item.priority,
      notes: item.notes,
      tags: item.tags,
    });
    setError("");
    setShowModal(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!form.name.trim() || !form.destination_url.trim()) {
      setError("Nome e destino são obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const endpoint = editing ? "/api/admin/affiliates/" + editing.id : "/api/admin/affiliates";
      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível salvar.");
      setNotice(editing ? "Link atualizado." : "Link criado.");
      setEditing(null);
      setForm(EMPTY);
      setShowModal(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (item: AffiliateLink) => {
    if (!window.confirm('Arquivar o link "' + item.name + '"? O slug permanece registrado, mas o redirect deixa de funcionar.')) return;
    try {
      const response = await fetch("/api/admin/affiliates/" + item.id, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível arquivar.");
      setNotice("Link arquivado.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar.");
    }
  };

  const checkLinks = async (ids?: string[]) => {
    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/affiliates/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Falha na verificação.");
      setNotice(payload.checked ? payload.checked + " link(s) verificado(s)." : "Nenhum link elegível.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao verificar links.");
    } finally {
      setChecking(false);
    }
  };

  const copyPath = async (slug: string) => {
    const path = "/go/" + slug + "/";
    try {
      await navigator.clipboard.writeText(path);
      setCopied(slug);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Não foi possível copiar o caminho.");
    }
  };

  const activeCount = useMemo(() => links.filter((item) => item.status === "active").length, [links]);

  if (loading) {
    return <div className="py-20 text-center text-[var(--muted)]">Carregando central de afiliados...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--amber)] font-bold">Central comercial</p>
          <h1 className="font-display text-3xl mt-1">Links de afiliado</h1>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">
            Um único ponto para trocar destinos, controlar status, testar saúde e acompanhar cliques.
            O conteúdo usa o slug /go/; você não precisa editar cada página quando a oferta muda.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => checkLinks()}
            disabled={checking || stats.active === 0}
            className="border border-border px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--surface2)] disabled:opacity-50"
          >
            {checking ? "Verificando..." : "Verificar ativos"}
          </button>
          <button
            onClick={openNew}
            className="bg-[var(--amber)] text-black font-heading font-extrabold px-4 py-2.5 rounded-xl hover:bg-white"
          >
            + Novo link
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-[var(--red)]/30 bg-[var(--red)]/5 text-[var(--red)] px-4 py-3 text-sm">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 text-[var(--green)] px-4 py-3 text-sm">{notice}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {[
          ["Total", stats.total],
          ["Ativos", stats.active],
          ["Pausados", stats.paused],
          ["Problemas", stats.broken],
          ["Não verificados", stats.unchecked],
          ["Arquivados", stats.archived],
          ["Cliques", stats.clicks],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[var(--surface)] border border-border rounded-xl p-4">
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="text-2xl font-display text-[var(--amber)] mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Produto, slug, categoria ou nota..."
            className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--amber)]"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm">
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="paused">Pausados</option>
            <option value="broken">Com problema</option>
            <option value="archived">Arquivados</option>
          </select>
          <select value={marketplace} onChange={(e) => setMarketplace(e.target.value)} className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm">
            <option value="">Todos os marketplaces</option>
            {Array.from(new Set([...MARKETPLACES, ...marketplaces])).map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={health} onChange={(e) => setHealth(e.target.value)} className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2.5 text-sm">
            <option value="">Toda saúde</option>
            <option value="unknown">Não verificado</option>
            <option value="healthy">OK</option>
            <option value="redirect">Redirecionando</option>
            <option value="error">Erro</option>
          </select>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold">Registro central</h2>
            <p className="text-xs text-[var(--muted)] mt-1">{links.length} exibidos · {activeCount} ativos no filtro atual</p>
          </div>
          <span className="text-xs text-[var(--muted)]">Última atualização: {formatDate(links[0]?.updated_at || null)}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1080px]">
            <thead>
              <tr className="text-left border-b border-border text-[var(--muted)]">
                <th className="px-5 py-3">Link</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Marketplace</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Saúde</th>
                <th className="px-4 py-3">Cliques</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {links.map((item) => (
                <tr key={item.id} className="border-b border-border/70 hover:bg-[var(--surface2)]">
                  <td className="px-5 py-4">
                    <p className="font-medium truncate max-w-[330px]">{item.name}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">/go/{item.slug}/ · {host(item.destination_url)}</p>
                    {item.category && <span className="inline-block text-[10px] mt-2 rounded-full bg-[var(--surface2)] border border-border px-2 py-1">{item.category}</span>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs font-medium">{SOURCE_LABEL[item.source_type]}</span>
                    {item.source_ref && <p className="text-[10px] text-[var(--muted)] mt-1 max-w-[180px] truncate">{item.source_ref}</p>}
                  </td>
                  <td className="px-4 py-4 text-xs">{item.marketplace}</td>
                  <td className="px-4 py-4">
                    <span className={"inline-flex rounded-full border px-2 py-1 text-[10px] font-bold " + badgeClass(item.status)}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={"inline-flex rounded-full border px-2 py-1 text-[10px] font-bold " + badgeClass(item.health_status)}>
                      {HEALTH_LABEL[item.health_status]}{item.http_status ? " · " + item.http_status : ""}
                    </span>
                    {item.last_checked_at && <p className="text-[10px] text-[var(--muted)] mt-1">{formatDate(item.last_checked_at)}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <span>{item.total_clicks}</span>
                    {item.last_clicked_at && <p className="text-[10px] text-[var(--muted)] mt-1">último {formatDate(item.last_clicked_at)}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => copyPath(item.slug)} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">
                        {copied === item.slug ? "Copiado" : "Copiar /go/"}
                      </button>
                      <button onClick={() => checkLinks([item.id])} disabled={checking} className="text-xs text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50">Testar</button>
                      <button onClick={() => openEdit(item)} className="text-xs text-[var(--amber)] hover:underline">Editar</button>
                      {item.status !== "archived" && <button onClick={() => archive(item)} className="text-xs text-[var(--red)] hover:underline">Arquivar</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!links.length && <tr><td colSpan={7} className="px-5 py-12 text-center text-[var(--muted)]">Nenhum link encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-[var(--surface)] border border-border rounded-xl p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--amber)] font-bold">Arquitetura</p>
        <h2 className="font-heading font-bold text-xl mt-1">Conteúdo desacoplado do destino</h2>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-4xl">
          As páginas apontam para um slug estável em <code>/go/</code>. O destino comercial fica neste registro.
          Isso permite trocar campanha, marketplace ou URL de afiliado sem editar o conteúdo editorial nem republicar cada review.
        </p>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-[var(--bg)] border border-border rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[var(--amber)] font-bold">Gerenciar destino</p>
                <h2 className="font-display text-xl mt-1">{editing ? "Editar link" : "Novo link"}</h2>
              </div>
              <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(false); }} className="text-2xl text-[var(--muted)]">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-xs text-[var(--muted)]">
                  Nome
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm text-[var(--text)]" />
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Slug /go/
                  <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm text-[var(--text)]" />
                </label>
              </div>

              <label className="text-xs text-[var(--muted)] block">
                URL de afiliado / destino HTTPS *
                <input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm text-[var(--text)] font-mono" />
                <span className="block mt-1">A URL fica apenas no servidor; o conteúdo público usa somente /go/{form.slug || "seu-slug"}/.</span>
              </label>

              <div className="grid md:grid-cols-4 gap-4">
                <label className="text-xs text-[var(--muted)]">
                  Marketplace
                  <select value={form.marketplace} onChange={(e) => setForm({ ...form, marketplace: e.target.value })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm">
                    {Array.from(new Set([...MARKETPLACES, ...marketplaces])).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm">
                    {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Origem
                  <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value as SourceType })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm">
                    {Object.entries(SOURCE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Prioridade
                  <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) || 0 })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm" />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-xs text-[var(--muted)]">
                  Categoria
                  <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm" />
                </label>
                <label className="text-xs text-[var(--muted)]">
                  Referência de origem
                  <input value={form.source_ref} onChange={(e) => setForm({ ...form, source_ref: e.target.value })} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm" />
                </label>
              </div>

              <label className="text-xs text-[var(--muted)] block">
                Tags
                <input
                  value={form.tags.join(", ")}
                  onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                  className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm"
                  placeholder="mercado-livre, hero, melhores"
                />
              </label>

              <label className="text-xs text-[var(--muted)] block">
                Notas operacionais
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="mt-1 w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2.5 text-sm resize-none" />
              </label>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(false); }} className="px-4 py-2.5 text-sm text-[var(--muted)]">Cancelar</button>
              <button onClick={save} disabled={saving} className="bg-[var(--amber)] text-black font-heading font-extrabold px-5 py-2.5 rounded-xl disabled:opacity-50">
                {saving ? "Salvando..." : "Salvar link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
