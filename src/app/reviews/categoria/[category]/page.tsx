import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchAllReviews, fetchCategories, normalizeCategoryName } from "@/lib/data";
import { ItemListSchema } from "@/components/SchemaMarkup";

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
  const category = normalizeCategoryName(safeDecode(raw));
  return {
    title: `Melhores ${category} — Reviews e Comparativos`,
    description: `Reviews independentes de ${category}. Análises com prós, contras, notas e links para as melhores ofertas.`,
    alternates: {
      canonical: `/reviews/categoria/${encodeURIComponent(category)}/`,
    },
  };
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

export default async function CategoryHubPage({ params }: PageProps) {
  const { category: raw } = await params;
  const requestedCategory = safeDecode(raw);
  const canonicalCategory = normalizeCategoryName(requestedCategory);

  const [reviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

  const filtered = reviews.filter((r) => r.category === canonicalCategory);

  if (filtered.length === 0) notFound();

  if (requestedCategory !== canonicalCategory) {
    permanentRedirect(
      `/reviews/categoria/${encodeURIComponent(canonicalCategory)}/`
    );
  }

  return (
    <>
      <ItemListSchema
        items={filtered.map((review) => ({
          name: review.product,
          url: `https://www.vetor.blog/reviews/${review.slug}`,
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews" },
                { label: canonicalCategory },
              ]}
            />
            <span className="eyebrow">Categoria</span>
            <h1>{canonicalCategory}</h1>
            <p className="hero-lead">
              {filtered.length} review{filtered.length === 1 ? "" : "s"} em {canonicalCategory} para você
              escolher com confiança.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
              <a href="/reviews/" style={chip(false)}>
                Todos ({reviews.length})
              </a>
              {categories.map((cat) => {
                const isActive =
                  cat.name === canonicalCategory;
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

            <div className="home-card-grid">
              {filtered.map((review) => (
                <ReviewCard key={review.slug} review={review} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
