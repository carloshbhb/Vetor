import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchAllReviews, fetchCategories } from "@/lib/data";

interface PageProps {
  params: Promise<{ category: string }>;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateStaticParams() {
  const categories = await fetchCategories();
  return categories.map((cat) => ({ category: cat.name }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: raw } = await params;
  const category = safeDecode(raw);
  return {
    title: `Melhores ${category} — Reviews e Comparativos`,
    description: `Reviews independentes de ${category}. Análises com prós, contras, notas e links para as melhores ofertas.`,
    alternates: {
      canonical: `/reviews/categoria/${encodeURIComponent(category)}`,
    },
  };
}

export default async function CategoryHubPage({ params }: PageProps) {
  const { category: raw } = await params;
  const category = safeDecode(raw);

  const [reviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

  const filtered = reviews.filter(
    (r) => r.category.toLowerCase() === category.toLowerCase()
  );

  if (filtered.length === 0) notFound();

  const canonicalCategory =
    categories.find((c) => c.name.toLowerCase() === category.toLowerCase())
      ?.name || category;

  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews" },
                { label: canonicalCategory },
              ]}
            />
            <span className="sec-label">Categoria</span>
            <h1 className="sec-h">{canonicalCategory.toUpperCase()}</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              {filtered.length} review{filtered.length === 1 ? "" : "s"} em {canonicalCategory} para você escolher com confiança.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
              <a
                href="/reviews"
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  borderRadius: 6,
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  background: "var(--surface)",
                  color: "var(--body)",
                  border: "1.5px solid var(--border)",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
              >
                Todos ({reviews.length})
              </a>
              {categories.map((cat) => {
                const isActive =
                  cat.name.toLowerCase() === category.toLowerCase();
                return (
                  <a
                    key={cat.name}
                    href={`/reviews/categoria/${encodeURIComponent(cat.name)}`}
                    style={{
                      display: "inline-block",
                      padding: "8px 18px",
                      borderRadius: 6,
                      fontFamily: "'Syne',sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      background: isActive ? "var(--blue)" : "var(--surface)",
                      color: isActive ? "#fff" : "var(--body)",
                      border: isActive
                        ? "1.5px solid var(--blue)"
                        : "1.5px solid var(--border)",
                      textDecoration: "none",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {cat.name} ({cat.count})
                  </a>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((review) => (
                <ReviewCard key={review.slug} review={review} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
