import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchAllReviews, fetchCategories, normalizeCategoryName } from "@/lib/data";
import { ItemListSchema } from "@/components/SchemaMarkup";
import Link from "next/link";
import { buildBuyingGuideCategories, buildBuyingIntentPages, getBuyingIntentDescription, getBuyingIntentLabel } from "@/lib/buying";

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
    title: `Reviews de ${category} — análises e comparativos`,
    description: `Veja reviews de ${category}, com notas, prós, contras, especificações, comparativos e links para ofertas quando disponíveis.`,
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
  const buyingGuide = buildBuyingGuideCategories(reviews, 3).find(
    (item) => item.name === canonicalCategory
  );
  const buyingIntents = buildBuyingIntentPages(reviews, 4).filter(
    (item) => item.categoryName === canonicalCategory
  );

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

            {(buyingGuide || buyingIntents.length > 0) && (
              <section className="buying-intent-section" aria-labelledby="comprar-categoria-heading">
                <div className="section-kicker">Próximo passo</div>
                <h2 id="comprar-categoria-heading">Quer comparar antes de comprar?</h2>
                <p>
                  Estes reviews ajudam na pesquisa. Se você já está na etapa de escolha, veja a seleção da categoria
                  e, quando houver dados suficientes, compare por preço ou custo-benefício.
                </p>
                <div className="buying-intent-section-links">
                  {buyingGuide && (
                    <Link className="cta" href={"/melhores/" + buyingGuide.slug + "/"}>
                      Ver melhores {canonicalCategory} →
                    </Link>
                  )}
                </div>
                {buyingIntents.length > 0 && (
                  <div className="buying-intent-grid">
                    {buyingIntents.map((item) => (
                      <Link
                        key={item.intent}
                        className="buying-intent-card"
                        href={"/melhores/" + item.categorySlug + "/" + item.intent + "/"}
                      >
                        <span>{getBuyingIntentLabel(item.intent)}</span>
                        <strong>{getBuyingIntentLabel(item.intent)} em {canonicalCategory}</strong>
                        <small>{getBuyingIntentDescription(item.intent, canonicalCategory)}</small>
                        <b>Ver seleção →</b>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )}

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
