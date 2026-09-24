import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Tags", href: "/tags" },
                { label: entry.tag },
              ]}
            />
            <span className="sec-label">Tag</span>
            <h1 className="sec-h">{entry.tag.toUpperCase()}</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              {filtered.length} review{filtered.length === 1 ? "" : "s"} com a tag {entry.tag} para você escolher com confiança.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
              <a
                href="/tags"
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  borderRadius: 6,
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  background: "var(--blue)",
                  color: "#fff",
                  border: "1.5px solid var(--blue)",
                  textDecoration: "none",
                  transition: "border-color 0.15s",
                }}
              >
                Todas ({tags.length})
              </a>
              {related.map((tag) => (
                <a
                  key={tag.slug}
                  href={`/tags/${tag.slug}`}
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
                  {tag.tag} ({tag.count})
                </a>
              ))}
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
