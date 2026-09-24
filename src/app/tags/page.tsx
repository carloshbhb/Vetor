import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchAllReviews } from "@/lib/data";
import { buildTagIndex } from "@/lib/tags";

export const metadata: Metadata = {
  title: "Tags de Reviews — Temas, Marcas e Comparativos",
  description:
    "Navegue por todas as tags de reviews do vetor.blog: temas, marcas e comparações das nossas análises independentes.",
  alternates: { canonical: "/tags" },
};

export default async function TagsIndexPage() {
  const reviews = await fetchAllReviews();
  const tags = buildTagIndex(reviews);

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
                { label: "Tags" },
              ]}
            />
            <span className="sec-label">Tags</span>
            <h1 className="sec-h">TODAS AS TAGS</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Explore reviews por tema, marca e comparação com as tags do vetor.blog.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            {tags.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>
                  Nenhuma tag disponível no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {tags.map((tag) => (
                  <a
                    key={tag.slug}
                    href={`/tags/${tag.slug}`}
                    style={{
                      display: "block",
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 10,
                      padding: 20,
                      textDecoration: "none",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Bebas Neue',sans-serif",
                        color: "var(--blue)",
                        fontSize: "1.8rem",
                        fontWeight: 700,
                        lineHeight: 1,
                        marginBottom: 4,
                      }}
                    >
                      {tag.count}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      {tag.tag}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
