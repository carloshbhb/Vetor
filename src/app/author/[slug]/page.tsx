import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Autor", href: "/author" },
                { label: author.name },
              ]}
            />
            <span className="eyebrow">Autor</span>
            <h1>{author.name}</h1>
            <p className="hero-lead">
              {author.role} do vetor.blog.{" "}
              {sorted.length > 0
                ? `${sorted.length} artigo${sorted.length === 1 ? "" : "s"} publicado${
                    sorted.length === 1 ? "" : "s"
                  }.`
                : ""}
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="author" style={{ maxWidth: 680, marginBottom: 56 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "#dfe5eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  color: "#556170",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div>
                <strong>{author.name}</strong>
                <p>
                  {author.role}. {author.bio}
                </p>
                <ul>
                  {author.credentials.map((line) => (
                    <li key={line}>✓ {line}</li>
                  ))}
                </ul>
              </div>
            </div>

            <h2 style={{ marginBottom: 32 }}>
              {sorted.length > 0 ? "Publicações recentes" : "Nenhum artigo ainda"}
            </h2>

            {sorted.length > 0 ? (
              <div className="home-card-grid">
                {sorted.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
                Novos artigos em breve. Enquanto isso, confira todos os{" "}
                <a href="/reviews">reviews do vetor.blog</a>.
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
