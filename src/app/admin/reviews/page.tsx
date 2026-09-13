"use client";

import { useEffect, useState } from "react";
import { fetchAllReviews } from "@/lib/data";
import type { Review } from "@/lib/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAllReviews().then((r) => {
      setReviews(r);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm(`Tem certeza que deseja excluir o review "${slug}"?`)) return;
    setDeleting(slug);
    try {
      await fetch(`/api/admin/reviews/${slug}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.slug !== slug));
    } catch {
      alert("Erro ao excluir review.");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--muted)]">Carregando reviews...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <span className="text-sm text-[var(--muted)]">{reviews.length} reviews</span>
      </div>

      <div className="bg-[var(--surface)] border border-white/8 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-4 py-3 font-semibold text-[var(--text)]">
                  Produto
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text)]">
                  Categoria
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text)]">
                  Nota
                </th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text)]">
                  Preço
                </th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--text)]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr
                  key={review.slug}
                  className="border-b border-white/5 hover:bg-[var(--surface2)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <a
                      href={`/reviews/${review.slug}`}
                      className="text-[var(--text)] hover:text-[var(--blue)] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {review.product}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-[var(--surface3)] text-xs text-[var(--muted)] px-2 py-0.5 rounded-full">
                      {review.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        review.verdict_score >= 8
                          ? "text-[var(--green)]"
                          : review.verdict_score >= 5
                          ? "text-[var(--orange)]"
                          : "text-[var(--red)]"
                      }`}
                    >
                      {review.verdict_score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--green)]">
                    {review.price_new}
                  </td>
                  <td className="px-4 py-3 text-right">
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
