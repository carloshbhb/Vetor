"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAllReviews, fetchAllViralArticles, fetchCategories } from "@/lib/data";
import type { Review, ViralArticle, Category } from "@/lib/types";

export default function AdminDashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [articles, setArticles] = useState<ViralArticle[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllReviews(), fetchAllViralArticles(), fetchCategories()]).then(([r, a, c]) => {
      setReviews(r);
      setArticles(a);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  const published = useMemo(() => reviews.filter((review) => review.status === "published").length, [reviews]);
  const drafts = reviews.length - published;
  const averageScore = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + Number(review.verdict_score || 0), 0) / reviews.length;
  }, [reviews]);

  if (loading) {
    return <div className="min-h-[45vh] flex items-center justify-center"><div className="text-center"><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-border border-t-[var(--amber)]" /><p className="text-sm font-semibold">Carregando visão geral…</p></div></div>;
  }

  return (
    <div>
      <header className="mb-7 rounded-2xl border border-border bg-[var(--surface)] p-6 lg:p-7 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <span className="inline-flex rounded-full bg-[var(--amber-bg)] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">Central de gestão</span>
            <h1 className="mt-3 font-display text-3xl font-black tracking-tight lg:text-4xl">Painel administrativo</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Use esta tela para saber o que existe no site, detectar pendências e entrar diretamente na área certa sem procurar funções espalhadas.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <a href="/admin/generate" className="min-h-[48px] rounded-xl bg-[#111] px-4 py-3 text-center text-sm font-extrabold text-white hover:bg-[#2b2b2b]">Gerar conteúdo</a>
            <a href="/admin/afiliados" className="min-h-[48px] rounded-xl border border-border bg-[var(--surface2)] px-4 py-3 text-center text-sm font-bold hover:bg-[var(--surface)]">Gerir afiliados</a>
          </div>
        </div>
      </header>

      <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          ["Reviews", reviews.length, published + " publicados"],
          ["Rascunhos", drafts, drafts ? "pedem revisão" : "fila limpa"],
          ["Artigos", articles.length, "comparativos/virais"],
          ["Categorias", categories.length, "áreas editoriais"],
          ["Nota média", averageScore ? averageScore.toFixed(1) : "—", "dos reviews"],
        ].map(([label, value, caption]) => (
          <div key={String(label)} className="rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
            <p className="mt-2 font-display text-3xl font-black text-[var(--text)]">{value}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{caption}</p>
          </div>
        ))}
      </section>

      <section className="mb-7 grid gap-4 lg:grid-cols-3">
        {[
          { eyebrow: "Conteúdo", title: "Publicação editorial", text: "Revise rascunhos, acompanhe reviews existentes e mantenha o inventário organizado.", href: "/admin/reviews", action: "Abrir reviews" },
          { eyebrow: "Comercial", title: "Ofertas e afiliados", text: "Troque destinos, teste links, pesquise anúncios do Mercado Livre e acompanhe cliques.", href: "/admin/afiliados", action: "Abrir Central" },
          { eyebrow: "SEO", title: "Crescimento orgânico", text: "Use sinais reais do Search Console e do Radar de Mercado para decidir o próximo conteúdo.", href: "/admin/oportunidades", action: "Abrir oportunidades" },
        ].map((card) => (
          <a key={card.title} href={card.href} className="group rounded-2xl border border-border bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--amber)]/40">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--amber)]">{card.eyebrow}</p>
            <h2 className="mt-2 font-heading text-lg font-black">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.text}</p>
            <span className="mt-4 inline-flex text-xs font-extrabold text-[var(--text)] group-hover:text-[var(--amber)]">{card.action} →</span>
          </a>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="font-heading text-lg font-black">Últimos reviews</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Atalho para o inventário editorial mais recente.</p>
          </div>
          <div className="divide-y divide-border">
            {reviews.slice(0, 6).map((review) => (
              <a key={review.slug} href="/admin/reviews" className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--surface2)]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{review.product}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{review.category} · {review.status === "published" ? "Publicado" : "Rascunho"}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-[var(--amber-bg)] px-2.5 py-1 text-xs font-black text-[var(--amber)]">{Number(review.verdict_score || 0).toFixed(1)}</span>
              </a>
            ))}
            {!reviews.length && <div className="p-10 text-center text-sm text-[var(--muted)]">Nenhum review encontrado.</div>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)] shadow-sm">
          <div className="border-b border-border p-5">
            <h2 className="font-heading text-lg font-black">Distribuição por categoria</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Ajuda a perceber rapidamente onde o catálogo está concentrado.</p>
          </div>
          <div className="divide-y divide-border">
            {categories.slice(0, 8).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <span className="text-sm font-semibold">{cat.name}</span>
                <span className="rounded-full bg-[var(--surface2)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">{cat.count}</span>
              </div>
            ))}
            {!categories.length && <div className="p-10 text-center text-sm text-[var(--muted)]">Nenhuma categoria encontrada.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
