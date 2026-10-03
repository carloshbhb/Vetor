import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import Link from "next/link";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BreadcrumbSchema, ItemListSchema } from "@/components/SchemaMarkup";
import { fetchAllReviews, fetchCategories, normalizeCategoryName } from "@/lib/data";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { page, category } = await searchParams;
  const pageNum = Number.parseInt(page ?? "1", 10);
  const safePage = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  return {
    title: "Reviews de Produtos — Análises, Notas e Ofertas",
    description:
      "Reviews independentes com notas, prós e contras de wearables, fones, notebooks e mais. Filtre por categoria e encontre o melhor produto.",
    alternates: {
      canonical: safePage > 1 ? `/reviews/?page=${safePage}` : "/reviews/",
    },
    robots: category
      ? { index: false, follow: true }
      : safePage > 1
        ? { index: false, follow: true }
        : { index: true, follow: true },
  };
}

const PAGE_SIZE = 24;

function reviewsHref(pageNumber: number, category: string | null): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  const query = params.toString();
  return query ? `/reviews/?${query}` : "/reviews/";
}

function pageNumbers(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  let prev = 0;
  for (const n of pages) {
    if (n - prev > 1) items.push("gap");
    items.push(n);
    prev = n;
  }
  return items;
}

const chip = (active: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "8px 18px",
  borderRadius: 999,
  fontSize: "0.78rem",
  fontWeight: 800,
  textDecoration: "none",
  background: active ? "var(--dark)" : "#fff",
  color: active ? "#fff" : "#354150",
  border: active ? "1.5px solid var(--dark)" : "1.5px solid var(--line)",
});

const pageNum = (active: boolean): React.CSSProperties => ({
  minWidth: 40,
  textAlign: "center",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: "0.82rem",
  fontWeight: 800,
  textDecoration: "none",
  lineHeight: 1.4,
  background: active ? "var(--dark)" : "#fff",
  color: active ? "#fff" : "#354150",
  border: active ? "1.5px solid var(--dark)" : "1.5px solid var(--line)",
});

export default async function ReviewsPage({ searchParams }: PageProps) {
  const { category, page } = await searchParams;
  const activeCategory = category?.trim() || null;

  const [allReviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

  if (activeCategory) {
    const normalizedCategory = normalizeCategoryName(activeCategory);
    const hasCanonicalCategory = categories.some(
      (item) => item.name.toLowerCase() === normalizedCategory.toLowerCase()
    );
    if (hasCanonicalCategory) {
      permanentRedirect(
        `/reviews/categoria/${encodeURIComponent(normalizedCategory)}/`
      );
    }
  }

  const reviews = activeCategory
    ? allReviews.filter(
        (r) => r.category.toLowerCase() === activeCategory.toLowerCase()
      )
    : allReviews;

  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(page ?? "1", 10);
  const currentPage = Number.isNaN(requestedPage)
    ? 1
    : Math.min(Math.max(requestedPage, 1), totalPages);
  const paginatedReviews = reviews.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Início", url: "https://www.vetor.blog/" }, { name: "Reviews", url: "https://www.vetor.blog/reviews/" }]} />
      <ItemListSchema
        items={reviews.map((r) => ({
          name: r.product,
          url: `/reviews/${r.slug}`,
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Reviews" }]} />
            <span className="eyebrow">Reviews</span>
            <h1>{activeCategory ?? "Todos os reviews"}</h1>
            <p className="hero-lead">
              {activeCategory
                ? `Análises da categoria ${activeCategory} para você escolher com confiança.`
                : "Análises detalhadas para você escolher com confiança."}
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="buying-guide-intro">
              <div><span className="eyebrow-small">Próximo passo</span><h2>Já está escolhendo o que comprar?</h2><p>Use os guias de compra para comparar produtos por categoria, nota editorial e, quando houver dados suficientes, por preço ou custo-benefício.</p></div>
              <Link className="cta" href="/melhores/">Ver guias de compra →</Link>
            </div>
            {categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
                <a href="/reviews/" style={chip(!activeCategory)}>
                  Todos ({allReviews.length})
                </a>
                {categories.map((cat) => {
                  const isActive =
                    !!activeCategory &&
                    cat.name.toLowerCase() === activeCategory.toLowerCase();
                  return (
                    <a
                      key={cat.name}
                      href={`/reviews/categoria/${encodeURIComponent(cat.name)}/`}
                      style={chip(isActive)}
                    >
                      {cat.name} ({cat.count})
                    </a>
                  );
                })}
              </div>
            )}

            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>Nenhum review encontrado.</p>
              </div>
            ) : (
              <div className="home-card-grid">
                {paginatedReviews.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Paginação"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 40,
                }}
              >
                {currentPage > 1 ? (
                  <a
                    href={reviewsHref(currentPage - 1, activeCategory)}
                    style={pageNum(false)}
                    rel="prev"
                  >
                    ← Anterior
                  </a>
                ) : (
                  <span style={{ ...pageNum(false), opacity: 0.4 }} aria-disabled="true">
                    ← Anterior
                  </span>
                )}

                {pageNumbers(currentPage, totalPages).map((item, index) =>
                  item === "gap" ? (
                    <span
                      key={`gap-${index}`}
                      aria-hidden="true"
                      style={{ color: "var(--muted)", fontSize: "0.8rem", padding: "0 4px" }}
                    >
                      …
                    </span>
                  ) : item === currentPage ? (
                    <span key={item} aria-current="page" style={pageNum(true)}>
                      {item}
                    </span>
                  ) : (
                    <a
                      key={item}
                      href={reviewsHref(item, activeCategory)}
                      style={pageNum(false)}
                    >
                      {item}
                    </a>
                  )
                )}

                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", padding: "0 6px" }}>
                  Página {currentPage} de {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <a
                    href={reviewsHref(currentPage + 1, activeCategory)}
                    style={pageNum(false)}
                    rel="next"
                  >
                    Próxima →
                  </a>
                ) : (
                  <span style={{ ...pageNum(false), opacity: 0.4 }} aria-disabled="true">
                    Próxima →
                  </span>
                )}
              </nav>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
