"use client";

import { useEffect, useState } from "react";
import type { Review } from "@/lib/types";
import { isGuideLikeSlug } from "@/lib/buying";


export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/reviews");
        if (res.status === 401) {
          setError("Não autorizado. Faça login novamente.");
          setReviews([]);
        } else if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Erro ao carregar reviews.");
        } else {
          const data = await res.json();
          setReviews(
            (Array.isArray(data) ? data : []).filter(
              (review: Review) => !isGuideLikeSlug(review.slug)
            )
          );
          setError("");
        }
      } catch {
        setError("Erro de conexão ao carregar reviews.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Tem certeza que deseja excluir o review "${slug}"?`)) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/admin/reviews?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Erro ao excluir review.");
        return;
      }
      setReviews((prev) => prev.filter((r) => r.slug !== slug));
    } catch {
      alert("Erro ao excluir review.");
    } finally {
      setDeleting(null);
    }
  };

  const handlePublish = async (slug: string) => {
    setPublishing(slug);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug, status: "published" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Erro ao publicar review.");
        return;
      }
      setReviews((prev) =>
        prev.map((r) => (r.slug === slug ? { ...r, status: "published" } : r))
      );
    } catch {
      alert("Erro ao publicar review.");
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--muted)]">Carregando reviews...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="font-display text-3xl mb-6">Reviews</h1>
        <div className="bg-[var(--red)]/10 border border-[var(--red)]/20 text-[var(--red)] rounded-xl p-4 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Conteúdo editorial</span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Reviews</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Publique rascunhos, confira notas e preços e remova somente reviews que realmente não devem permanecer no site.</p>
          </div>
          <div className="rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Inventário</p>
            <p className="mt-1 font-display text-2xl font-black">{reviews.length}</p>
          </div>
        </div>
      </header>

      <div className="bg-[var(--surface)] border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--surface2)]">
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Produto</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Categoria</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Status</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Nota</th>
                <th className="text-left px-4 py-3 font-heading font-bold text-[var(--text)]">Preço</th>
                <th className="text-right px-4 py-3 font-heading font-bold text-[var(--text)]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr
                  key={review.slug}
                  className="border-b border-border hover:bg-[var(--surface2)] transition-colors"
                >
                  <td className="px-4 py-3">
                    {review.status === "published" ? (
                      <a
                        href={`/reviews/${review.slug}`}
                        className="text-[var(--text)] hover:text-[var(--amber)] transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {review.product}
                      </a>
                    ) : (
                      <span className="text-[var(--text)]">{review.product}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[var(--surface2)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                      {review.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        review.status === "published"
                          ? "bg-[var(--green)]/10 text-[var(--green)]"
                          : "bg-[var(--amber)]/10 text-[var(--amber)]"
                      }`}
                    >
                      {review.status === "published" ? "Publicado" : "Rascunho"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold ${
                        review.verdict_score >= 8
                          ? "text-[var(--green)]"
                          : review.verdict_score >= 5
                            ? "text-[var(--amber)]"
                            : "text-[var(--red)]"
                      }`}
                    >
                      {review.verdict_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text)]">
                    {review.price_new}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {review.status !== "published" && (
                      <button
                        onClick={() => handlePublish(review.slug)}
                        disabled={publishing === review.slug}
                        className="text-xs text-[var(--green)] hover:underline disabled:opacity-50"
                      >
                        {publishing === review.slug ? "Publicando..." : "Publicar"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.slug)}
                      disabled={deleting === review.slug}
                      className="text-xs text-[var(--red)] hover:underline disabled:opacity-50"
                    >
                      {deleting === review.slug ? "Excluindo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reviews.length === 0 && (
          <div className="text-center py-10 text-[var(--muted)]">
            Nenhum review encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
