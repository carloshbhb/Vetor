import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ItemListSchema } from "@/components/SchemaMarkup";
import { fetchAllReviews, fetchCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { page } = await searchParams;
  const pageNum = Number.parseInt(page ?? "1", 10);
  const safePage = Number.isNaN(pageNum) || pageNum < 1 ? 1 : pageNum;
  return {
    title: "Reviews de Produtos — Análises, Notas e Ofertas",
    description:
      "Reviews independentes com notas, prós e contras de wearables, fones, notebooks e mais. Filtre por categoria e encontre o melhor produto.",
    alternates: {
      canonical: safePage > 1 ? `/reviews?page=${safePage}` : "/reviews",
    },
  };
}

const PAGE_SIZE = 24;

function reviewsHref(pageNumber: number, category: string | null): string {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (pageNumber > 1) params.set("page", String(pageNumber));
  const query = params.toString();
  return query ? `/reviews?${query}` : "/reviews";
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

export default async function ReviewsPage({ searchParams }: PageProps) {
  const { category, page } = await searchParams;
  const activeCategory = category?.trim() || null;

  const [allReviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

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

  const chipBase: React.CSSProperties = {
    display: "inline-block",
    padding: "8px 18px",
    borderRadius: 6,
    fontFamily: "'Syne',sans-serif",
    fontSize: "0.78rem",
    fontWeight: 700,
    textDecoration: "none",
    transition: "border-color 0.15s",
  };

  const pageNumBase: React.CSSProperties = {
    fontFamily: "'Syne',sans-serif",
    fontSize: "0.8rem",
    fontWeight: 700,
    borderRadius: 6,
    padding: "6px 12px",
    textDecoration: "none",
    lineHeight: 1.4,
  };

  return (
    <>
      <ItemListSchema
        items={reviews.map((r) => ({
          name: r.product,
          url: `/reviews/${r.slug}`,
        }))}
      />
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Reviews" }]} />
            <span className="sec-label">Reviews</span>
            <h1 className="sec-h">
              {activeCategory ? activeCategory.toUpperCase() : "TODOS OS REVIEWS"}
            </h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              {activeCategory
                ? `Análises da categoria ${activeCategory} para você escolher com confiança.`
                : "Análises detalhadas para você escolher com confiança."}
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            {categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
                <a
                  href="/reviews"
                  style={{
                    ...chipBase,
                    background: !activeCategory ? "var(--blue)" : "var(--surface)",
                    color: !activeCategory ? "#fff" : "var(--body)",
                    border: !activeCategory
                      ? "1.5px solid var(--blue)"
                      : "1.5px solid var(--border)",
                  }}
                >
                  Todos ({allReviews.length})
                </a>
                {categories.map((cat) => {
                  const isActive =
                    !!activeCategory &&
                    cat.name.toLowerCase() === activeCategory.toLowerCase();
                  return (
                    <a
                      key={cat.name}
                      href={`/reviews/categoria/${encodeURIComponent(cat.name)}`}
                      style={{
                        ...chipBase,
                        background: isActive ? "var(--blue)" : "var(--surface)",
                        color: isActive ? "#fff" : "var(--body)",
                        border: isActive
                          ? "1.5px solid var(--blue)"
                          : "1.5px solid var(--border)",
                      }}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    className="btn-sec"
                    rel="prev"
                  >
                    ← Anterior
                  </a>
                ) : (
                  <span className="btn-sec" style={{ opacity: 0.4 }} aria-disabled="true">
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
                    <span
                      key={item}
                      aria-current="page"
                      style={{
                        ...pageNumBase,
                        background: "var(--blue)",
                        color: "#fff",
                        border: "1.5px solid var(--blue)",
                      }}
                    >
                      {item}
                    </span>
                  ) : (
                    <a
                      key={item}
                      href={reviewsHref(item, activeCategory)}
                      style={{
                        ...pageNumBase,
                        background: "var(--surface)",
                        color: "var(--body)",
                        border: "1.5px solid var(--border)",
                      }}
                    >
                      {item}
                    </a>
                  )
                )}

                <span
                  style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "var(--muted)",
                    padding: "0 6px",
                  }}
                >
                  Página {currentPage} de {totalPages}
                </span>

                {currentPage < totalPages ? (
                  <a
                    href={reviewsHref(currentPage + 1, activeCategory)}
                    className="btn-sec"
                    rel="next"
                  >
                    Próxima →
                  </a>
                ) : (
                  <span className="btn-sec" style={{ opacity: 0.4 }} aria-disabled="true">
                    Próxima →
                  </span>
                )}
              </nav>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
