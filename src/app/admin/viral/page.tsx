"use client";

import { useEffect, useState } from "react";
import { fetchAllViralArticles } from "@/lib/data";
import type { ViralArticle } from "@/lib/types";

export default function AdminViralPage() {
  const [articles, setArticles] = useState<ViralArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAllViralArticles().then((a) => {
      setArticles(a);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Tem certeza que deseja excluir o artigo "${slug}"?`)) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/admin/viral?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao excluir artigo.");
        return;
      }
      setArticles((prev) => prev.filter((a) => a.slug !== slug));
    } catch {
      alert("Erro ao excluir artigo.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--muted)]">Carregando artigos...</div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Conteúdo comparativo</span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Artigos Virais</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Acompanhe comparativos e pautas virais publicados, verifique quantos produtos cada artigo utiliza e mantenha o inventário limpo.</p>
          </div>
          <div className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Inventário</p>
            <p className="mt-1 font-display text-2xl font-black">{articles.length}</p>
          </div>
        </div>
      </header>

      <div className="bg-[var(--surface)] border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--surface2)]">
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Título</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Categoria</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Produtos</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Publicado</th>
                <th className="text-right px-4 py-3 font-heading font-bold text-[var(--text)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.slug}
                  className="border-b border-border hover:bg-[var(--surface2)] transition-colors"
                >
                  <td className="px-4 py-3 text-[var(--text)]">{article.title}</td>
                  <td className="px-4 py-3">
                    <span className="bg-[var(--surface2)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {article.products?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)] text-xs">
                    {article.published_at
                      ? new Date(article.published_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(article.slug)}
                      disabled={deleting === article.slug}
                      className="text-xs text-[var(--red)] hover:underline disabled:opacity-50"
                    >
                      {deleting === article.slug ? "Excluindo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {articles.length === 0 && (
          <div className="text-center py-10 text-[var(--muted)]">
            Nenhum artigo viral encontrado.
          </div>
        )}
      </div>
    </div>
  );
}