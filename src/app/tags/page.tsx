import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchAllReviews } from "@/lib/data";
import { buildIndexableTagIndex } from "@/lib/tags";

export const metadata: Metadata = {
  title: "Tags de Reviews — Temas, Marcas e Comparativos",
  description:
    "Navegue por todas as tags de reviews do vetor.blog: temas, marcas e comparações das nossas análises independentes.",
  alternates: { canonical: "/tags/" },
};

export default async function TagsIndexPage() {
  const reviews = await fetchAllReviews();
  const tags = buildIndexableTagIndex(reviews);

  return (
    <>
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews" },
                { label: "Tags" },
              ]}
            />
            <span className="eyebrow">Tags</span>
            <h1>Todas as tags</h1>
            <p className="hero-lead">
              Explore temas e marcas com pelo menos quatro reviews publicados. Priorizamos coleções com profundidade editorial para facilitar a descoberta de análises relacionadas.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            {tags.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>
                  Nenhuma tag disponível no momento.
                </p>
              </div>
            ) : (
              <div className="home-guide-grid">
                {tags.map((tag) => (
                  <a key={tag.slug} className="home-guide" href={`/tags/${tag.slug}`}>
                    <span className="home-guide-num">
                      {tag.count} review{tag.count === 1 ? "" : "s"}
                    </span>
                    <h3>{tag.tag}</h3>
                    <p>Reviews marcados com este tema.</p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
