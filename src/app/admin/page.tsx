"use client";

import { useEffect, useState } from "react";
import { fetchAllReviews, fetchAllViralArticles, fetchCategories } from "@/lib/data";
import type { Review, ViralArticle, Category } from "@/lib/types";

export default function AdminDashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [articles, setArticles] = useState<ViralArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllReviews(), fetchAllViralArticles(), fetchCategories()]).then(
      ([r, a, c]) => {
        setReviews(r);
        setArticles(a);
        setCategories(c);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-[var(--muted)]">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--surface)] border border-white/8 rounded-xl p-5">
          <p className="text-sm text-[var(--muted)]">Total de Reviews</p>
          <p className="text-3xl font-bold text-[var(--blue)] mt-1">
            {reviews.length}
          </p>
        </div>
        <div className="bg-[var(--surface)] border border-white/8 rounded-xl p-5">
          <p className="text-sm text-[var(--muted)]">Artigos Virais</p>
          <p className="text-3xl font-bold text-[var(--blue)] mt-1">
            {articles.length}
          </p>
        </div>
        <div className="bg-[var(--surface)] border border-white/8 rounded-xl p-5">
          <p className="text-sm text-[var(--muted)]">Categorias</p>
          <p className="text-3xl font-bold text-[var(--blue)] mt-1">
            {categories.length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-white/8 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Categorias</h2>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-sm text-[var(--text)]">{cat.name}</span>
                <span className="text-sm text-[var(--muted)] bg-[var(--surface2)] px-2 py-0.5 rounded-full">
                  {cat.count}
                </span>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Nenhuma categoria encontrada.</p>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-white/8 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-4">Últimos Reviews</h2>
          <div className="space-y-2">
            {reviews.slice(0, 5).map((review) => (
              <div
                key={review.slug}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--text)] truncate">{review.product}</p>
                  <p className="text-xs text-[var(--muted)]">{review.category}</p>
                </div>
                <span
                  className={`text-xs font-medium ml-3 ${
                    review.verdict_score >= 8
                      ? "text-[var(--green)]"
                      : review.verdict_score >= 5
                      ? "text-[var(--orange)]"
                      : "text-[var(--red)]"
                  }`}
                >
                  {review.verdict_score.toFixed(1)}
                </span>
              </div>
            ))}
            {reviews.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Nenhum review encontrado.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-[var(--surface)] border border-white/8 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/generate"
            className="bg-[var(--blue)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Gerar Conteúdo
          </a>
          <a
            href="/admin/reviews"
            className="border border-white/15 text-[var(--text)] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--surface2)] transition-colors"
          >
            Gerenciar Reviews
          </a>
          <a
            href="/admin/viral"
            className="border border-white/15 text-[var(--text)] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--surface2)] transition-colors"
          >
            Gerenciar Artigos
          </a>
        </div>
      </div>
    </div>
  );
}
