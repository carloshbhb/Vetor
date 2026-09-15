"use client";

import { useEffect, useState, useCallback } from "react";

interface ProductLink {
  id: string;
  slug: string;
  product_name: string;
  category: string;
  product_url: string;
  affiliate_url: string;
  image_url: string;
  marketplace: string;
  status: string;
  source: string;
  has_review: boolean;
  has_video: boolean;
  review_slug: string | null;
  video_id: string | null;
  price: number | null;
  score: number | null;
  priority: number;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  active: number;
  pending: number;
  reviewed: number;
  video_generated: number;
  archived: number;
}

const EMPTY_FORM: Omit<ProductLink, "id" | "created_at" | "updated_at"> = {
  slug: "",
  product_name: "",
  category: "",
  product_url: "",
  affiliate_url: "",
  image_url: "",
  marketplace: "mercadolivre",
  status: "pending",
  source: "manual",
  has_review: false,
  has_video: false,
  review_slug: null,
  video_id: null,
  price: null,
  score: null,
  priority: 0,
  notes: "",
  tags: [],
};

function getAuth() {
  return localStorage.getItem("vetor_admin_auth") || "";
}

const MARKETPLACES = [
  { value: "mercadolivre", label: "Mercado Livre" },
  { value: "amazon", label: "Amazon" },
  { value: "shopee", label: "Shopee" },
  { value: "magazineluiza", label: "Magazine Luiza" },
  { value: "casasbahia", label: "Casas Bahia" },
  { value: "americanas", label: "Americanas" },
  { value: "other", label: "Outro" },
];

const STATUSES = [
  { value: "active", label: "Ativo" },
  { value: "pending", label: "Pendente" },
  { value: "reviewed", label: "Revisado" },
  { value: "video_generated", label: "Vídeo Gerado" },
  { value: "archived", label: "Arquivado" },
];

export default function AdminProductLinksPage() {
  const [links, setLinks] = useState<ProductLink[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    pending: 0,
    reviewed: 0,
    video_generated: 0,
    archived: 0,
  });
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHasReview, setFilterHasReview] = useState<string>("all");
  const [filterHasVideo, setFilterHasVideo] = useState<string>("all");

  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<ProductLink | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus) params.set("status", filterStatus);
      if (filterHasReview !== "all") params.set("has_review", filterHasReview === "true" ? "true" : "false");
      if (filterHasVideo !== "all") params.set("has_video", filterHasVideo === "true" ? "true" : "false");

      const res = await fetch(`/api/admin/product-links?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getAuth()}` },
      });
      const data = await res.json();
      setLinks(data.data || []);
    } catch {
      setError("Erro ao carregar links.");
    }
    setLoading(false);
  }, [search, filterCategory, filterStatus, filterHasReview, filterHasVideo]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/product-links/stats", {
        headers: { Authorization: `Bearer ${getAuth()}` },
      });
      const data = await res.json();
      setStats(data.data || stats);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/admin/product-links", {
        headers: { Authorization: `Bearer ${getAuth()}` },
      });
      const data = await res.json();
      const allLinks: ProductLink[] = data.data || [];
      const counts: Record<string, number> = {};
      for (const link of allLinks) {
        if (link.category) {
          counts[link.category] = (counts[link.category] || 0) + 1;
        }
      }
      const sorted = Object.entries(counts)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);
      setCategories(sorted);
    } catch {}
  };

  useEffect(() => {
    fetchLinks();
    fetchStats();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (editingLink) {
        const res = await fetch(`/api/admin/product-links/${editingLink.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuth()}`,
          },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Erro ao salvar.");
      } else {
        const res = await fetch("/api/admin/product-links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAuth()}`,
          },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Erro ao criar.");
      }
      setShowModal(false);
      setEditingLink(null);
      setForm(EMPTY_FORM);
      fetchLinks();
      fetchStats();
    } catch {
      setError("Erro ao salvar o link.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este link?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/product-links/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuth()}` },
      });
      if (!res.ok) throw new Error("Erro ao excluir.");
      fetchLinks();
      fetchStats();
    } catch {
      alert("Erro ao excluir link.");
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const items = lines.map((line) => {
      const [product_name, category, product_url] = line.split("|").map((s) => s.trim());
      return {
        product_name: product_name || "",
        category: category || "",
        product_url: product_url || "",
        slug: (product_name || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      };
    });

    setBulkImporting(true);
    try {
      const res = await fetch("/api/admin/product-links/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuth()}`,
        },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      const created = data.data?.created || 0;
      const failed = data.data?.failed || 0;
      alert(`Importação concluída: ${created} criados, ${failed} falharam.`);
      setShowBulkModal(false);
      setBulkText("");
      fetchLinks();
      fetchStats();
      fetchCategories();
    } catch {
      alert("Erro ao importar links.");
    } finally {
      setBulkImporting(false);
    }
  };

  const openEdit = (link: ProductLink) => {
    setEditingLink(link);
    setForm({
      slug: link.slug,
      product_name: link.product_name,
      category: link.category,
      product_url: link.product_url,
      affiliate_url: link.affiliate_url,
      image_url: link.image_url,
      marketplace: link.marketplace,
      status: link.status,
      source: link.source,
      has_review: link.has_review,
      has_video: link.has_video,
      review_slug: link.review_slug,
      video_id: link.video_id,
      price: link.price,
      score: link.score,
      priority: link.priority,
      notes: link.notes,
      tags: link.tags,
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingLink(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "text-[var(--green)]",
      pending: "text-[var(--amber)]",
      reviewed: "text-blue-400",
      video_generated: "text-purple-400",
      archived: "text-[var(--muted)]",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      pending: "Pendente",
      reviewed: "Revisado",
      video_generated: "Vídeo Gerado",
      archived: "Arquivado",
    };
    return (
      <span className={`font-bold text-xs ${colors[status] || "text-[var(--muted)]"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Nome do Produto *</label>
          <input
            type="text"
            value={form.product_name}
            onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Categoria</label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">URL do Produto</label>
        <input
          type="url"
          value={form.product_url}
          onChange={(e) => setForm({ ...form, product_url: e.target.value })}
          className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">URL de Afiliado</label>
        <input
          type="url"
          value={form.affiliate_url}
          onChange={(e) => setForm({ ...form, affiliate_url: e.target.value })}
          className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">URL da Imagem</label>
        <input
          type="url"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Marketplace</label>
          <select
            value={form.marketplace}
            onChange={(e) => setForm({ ...form, marketplace: e.target.value })}
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          >
            {MARKETPLACES.map((mp) => (
              <option key={mp.value} value={mp.value}>
                {mp.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Prioridade</label>
          <input
            type="number"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Preço</label>
          <input
            type="number"
            step="0.01"
            value={form.price ?? ""}
            onChange={(e) =>
              setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : null })
            }
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Score</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={form.score ?? ""}
            onChange={(e) =>
              setForm({ ...form, score: e.target.value ? parseFloat(e.target.value) : null })
            }
            className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--muted)]">Tem Review</label>
          <button
            type="button"
            onClick={() => setForm({ ...form, has_review: !form.has_review })}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              form.has_review ? "bg-[var(--amber)]" : "bg-[var(--surface2)]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                form.has_review ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-[var(--muted)]">Tem Vídeo</label>
          <button
            type="button"
            onClick={() => setForm({ ...form, has_video: !form.has_video })}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              form.has_video ? "bg-[var(--amber)]" : "bg-[var(--surface2)]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                form.has_video ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Notas</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)] resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">Tags (separadas por vírgula)</label>
        <input
          type="text"
          value={form.tags.join(", ")}
          onChange={(e) =>
            setForm({
              ...form,
              tags: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)]"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--muted)]">Carregando product links...</div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] text-sm px-4 py-2 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl">Product Links</h1>
        <button
          onClick={() => { fetchLinks(); fetchStats(); }}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
        >
          ↻ Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Total</p>
          <p className="text-2xl font-display text-[var(--text)] mt-1">{stats.total}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Ativos</p>
          <p className="text-2xl font-display text-[var(--green)] mt-1">{stats.active}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Pendentes</p>
          <p className="text-2xl font-display text-[var(--amber)] mt-1">{stats.pending}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Revisados</p>
          <p className="text-2xl font-display text-blue-400 mt-1">{stats.reviewed}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Com Vídeo</p>
          <p className="text-2xl font-display text-purple-400 mt-1">{stats.video_generated}</p>
        </div>
        <div className="bg-[var(--surface)] border border-border rounded-xl p-4">
          <p className="text-xs text-[var(--muted)]">Arquivados</p>
          <p className="text-2xl font-display text-[var(--muted)] mt-1">{stats.archived}</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Buscar produto ou URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)] sm:col-span-2 lg:col-span-1"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          >
            <option value="">Todas categorias</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[var(--surface2)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
          >
            <option value="">Todos status</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)] whitespace-nowrap">Review:</label>
            <select
              value={filterHasReview}
              onChange={(e) => setFilterHasReview(e.target.value)}
              className="flex-1 bg-[var(--surface2)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
            >
              <option value="all">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)] whitespace-nowrap">Vídeo:</label>
            <select
              value={filterHasVideo}
              onChange={(e) => setFilterHasVideo(e.target.value)}
              className="flex-1 bg-[var(--surface2)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--amber)]"
            >
              <option value="all">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={openAdd}
          className="bg-[var(--amber)] text-black text-sm font-heading font-extrabold px-5 py-2.5 rounded-xl hover:bg-white transition-colors"
        >
          + Novo Link
        </button>
        <button
          onClick={() => setShowBulkModal(true)}
          className="bg-[var(--surface)] border border-border text-[var(--text)] text-sm font-heading font-bold px-5 py-2.5 rounded-xl hover:bg-[var(--surface2)] transition-colors"
        >
          Importar em Lote
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-border rounded-xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Produto</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Categoria</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Status</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Marketplace</th>
                <th className="text-center px-4 py-3 font-heading font-bold text-[var(--text)]">Review</th>
                <th className="text-center px-4 py-3 font-heading font-bold text-[var(--text)]">Vídeo</th>
                <th className="text-right px-4 py-3 font-heading font-bold text-[var(--text)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--muted)]">
                    Nenhum product link encontrado.
                  </td>
                </tr>
              ) : (
                links.map((link) => (
                  <tr
                    key={link.id}
                    className="border-b border-border hover:bg-[var(--surface2)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[var(--text)] font-medium">{link.product_name}</span>
                        {link.price != null && (
                          <span className="text-xs text-[var(--muted)]">R$ {link.price.toFixed(2)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-[var(--surface2)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                        {link.category || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(link.status)}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)] capitalize">{link.marketplace}</td>
                    <td className="px-4 py-3 text-center">
                      {link.has_review ? (
                        <span className="text-[var(--green)] text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-[var(--muted)] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {link.has_video ? (
                        <span className="text-[var(--green)] text-xs font-bold">✓</span>
                      ) : (
                        <span className="text-[var(--muted)] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(link)}
                          className="text-xs text-[var(--amber)] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          disabled={deleting === link.id}
                          className="text-xs text-[var(--red)] hover:underline disabled:opacity-50"
                        >
                          {deleting === link.id ? "..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {links.length === 0 ? (
          <div className="bg-[var(--surface)] border border-border rounded-xl p-8 text-center text-[var(--muted)]">
            Nenhum product link encontrado.
          </div>
        ) : (
          links.map((link) => (
            <div
              key={link.id}
              className="bg-[var(--surface)] border border-border rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{link.product_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {statusBadge(link.status)}
                    <span className="bg-[var(--surface2)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                      {link.category || "—"}
                    </span>
                  </div>
                </div>
                {link.price != null && (
                  <span className="text-sm text-[var(--text)] whitespace-nowrap">R$ {link.price.toFixed(2)}</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--muted)] mb-3">
                <span className="capitalize">{link.marketplace}</span>
                {link.has_review && <span className="text-[var(--green)]">✓ Review</span>}
                {link.has_video && <span className="text-purple-400">✓ Vídeo</span>}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openEdit(link)}
                  className="text-xs text-[var(--amber)] hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(link.id)}
                  disabled={deleting === link.id}
                  className="text-xs text-[var(--red)] hover:underline disabled:opacity-50"
                >
                  {deleting === link.id ? "..." : "Excluir"}
                </button>
                <a
                  href={link.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--muted)] hover:underline ml-auto"
                >
                  Abrir ↗
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--bg)] border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg">
                {editingLink ? "Editar Link" : "Novo Link"}
              </h2>
              <button
                onClick={() => { setShowModal(false); setEditingLink(null); }}
                className="text-[var(--muted)] hover:text-[var(--text)] text-xl"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4">{renderForm()}</div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => { setShowModal(false); setEditingLink(null); }}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.product_name}
                className="bg-[var(--amber)] text-black text-sm font-heading font-extrabold px-6 py-2 rounded-xl hover:bg-white transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : editingLink ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[var(--bg)] border border-border rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-display text-lg">Importar em Lote</h2>
              <button
                onClick={() => { setShowBulkModal(false); setBulkText(""); }}
                className="text-[var(--muted)] hover:text-[var(--text)] text-xl"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-[var(--muted)] mb-3">
                Formato: <code className="bg-[var(--surface2)] px-1 rounded">nome_produto|categoria|url_produto</code>
                <br />
                Um item por linha.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder={"Fone Bluetooth|Eletrônicos|https://produto.com/fone\nCapa iPhone|Acessórios|https://produto.com/capa"}
                className="w-full bg-[var(--surface)] border border-border rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--amber)] resize-none font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => { setShowBulkModal(false); setBulkText(""); }}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] px-4 py-2 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkImport}
                disabled={bulkImporting || !bulkText.trim()}
                className="bg-[var(--amber)] text-black text-sm font-heading font-extrabold px-6 py-2 rounded-xl hover:bg-white transition-colors disabled:opacity-50"
              >
                {bulkImporting ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
