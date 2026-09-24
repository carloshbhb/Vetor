import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import ReviewCard from "@/components/ReviewCard";
import { authors, getAuthorBySlug } from "@/data/authors";
import { fetchAllReviews } from "@/lib/data";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) return { title: "Autor não encontrado" };
  return {
    title: `${author.name} — Artigos e Reviews`,
    description: `Artigos e reviews independentes de ${author.name} no vetor.blog. ${author.tagline}`,
    alternates: { canonical: `/author/${author.slug}` },
    openGraph: {
      title: `${author.name} — Artigos e Reviews`,
      description: `Artigos e reviews independentes de ${author.name} no vetor.blog.`,
      url: `https://www.vetor.blog/author/${author.slug}`,
      type: "profile",
    },
  };
}

function reviewTimestamp(iso: string | null | undefined): number {
  if (!iso) return 0;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;
  const author = getAuthorBySlug(slug);
  if (!author) notFound();

  const reviews = await fetchAllReviews();
  const sorted = [...reviews]
    .sort(
      (a, b) =>
        reviewTimestamp(b.updated_at || b.created_at) -
        reviewTimestamp(a.updated_at || a.created_at)
    )
    .slice(0, 24);

  const initials = author.name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Autor", href: "/author" },
                { label: author.name },
              ]}
            />
            <span className="sec-label">Autor</span>
            <h1 className="sec-h">{author.name.toUpperCase()}</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              {author.role} do vetor.blog. {sorted.length > 0 ? `${sorted.length} artigo${sorted.length === 1 ? "" : "s"} publicado${sorted.length === 1 ? "" : "s"}.` : ""}
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            <div
              style={{
                maxWidth: 680,
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
                borderRadius: 16,
                padding: 32,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                marginBottom: 56,
              }}
            >
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--bg)",
                    border: "1.5px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    color: "var(--blue)",
                    fontFamily: "'Syne',sans-serif",
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "var(--ink)", marginBottom: 4 }}>
                    {author.name}
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--blue)", fontWeight: 700, fontFamily: "'Syne',sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                    {author.role}
                  </p>
                </div>
              </div>
              <p style={{ color: "var(--body)", fontWeight: 300, lineHeight: 1.8 }}>
                {author.bio}
              </p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
                {author.credentials.map((line) => (
                  <li
                    key={line}
                    style={{
                      color: "var(--body)",
                      fontWeight: 300,
                      fontSize: "0.9rem",
                      lineHeight: 1.6,
                      paddingLeft: 18,
                      position: "relative",
                    }}
                  >
                    <span style={{ position: "absolute", left: 0, color: "var(--green)" }}>✓</span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <span className="sec-label">Artigos de {author.name}</span>
            <h2 className="sec-h" style={{ marginBottom: 32 }}>
              {sorted.length > 0 ? "Publicações recentes" : "Nenhum artigo ainda"}
            </h2>

            {sorted.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sorted.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "1rem", fontWeight: 300 }}>
                Novos artigos em breve. Enquanto isso, confira todos os{" "}
                <a href="/reviews" style={{ color: "var(--blue)" }}>reviews do vetor.blog</a>.
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
