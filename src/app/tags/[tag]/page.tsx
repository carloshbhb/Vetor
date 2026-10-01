import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ItemListSchema } from "@/components/SchemaMarkup";
import { fetchAllReviews } from "@/lib/data";
import { buildTagIndex } from "@/lib/tags";

interface PageProps {
  params: Promise<{ tag: string }>;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateStaticParams() {
  const reviews = await fetchAllReviews();
  const tags = buildTagIndex(reviews);
  return tags.map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag: raw } = await params;
  const slug = safeDecode(raw);
  const reviews = await fetchAllReviews();
  const entry = buildTagIndex(reviews).find((t) => t.slug === slug);
  const label = entry?.tag || slug;
  return {
    title: `${label} — Reviews e Análises`,
    description: `Reviews independentes com a tag ${label}: prós, contras, notas e as melhores ofertas relacionadas.`,
    alternates: {
      canonical: `/tags/${encodeURIComponent(slug)}`,
    },
  };
}

const chip: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 18px",
  borderRadius: 999,
  fontSize: "0.78rem",
  fontWeight: 800,
  background: "#fff",
  color: "#354150",
  border: "1.5px solid var(--line)",
  textDecoration: "none",
};

export default async function TagHubPage({ params }: PageProps) {
  const { tag: raw } = await params;
  const slug = safeDecode(raw);

  const reviews = await fetchAllReviews();
  const tags = buildTagIndex(reviews);
  const entry = tags.find((t) => t.slug === slug);

  if (!entry) notFound();

  const filtered = entry.reviews.filter(
    (r) => !r.status || r.status === "published"
  );

  if (filtered.length === 0) notFound();

  const related = tags.filter((t) => t.slug !== entry.slug).slice(0, 24);

  return (
    <>
      <ItemListSchema
        items={filtered.map((r) => ({
          name: r.product,
          url: `/reviews/${r.slug}`,
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Tags", href: "/tags" },
                { label: entry.tag },
              ]}
            />
            <span className="eyebrow">Tag</span>
            <h1>{entry.tag}</h1>
            <p className="hero-lead">
              {filtered.length} review{filtered.length === 1 ? "" : "s"} com a tag {entry.tag} para você
              escolher com confiança.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
              <a href="/tags" style={chip}>
                Todas ({tags.length})
              </a>
              {related.map((tag) => (
                <a key={tag.slug} href={`/tags/${tag.slug}`} style={chip}>
                  {tag.tag} ({tag.count})
                </a>
              ))}
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
