import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import GuideCard from "@/components/GuideCard";
import { ItemListSchema } from "@/components/SchemaMarkup";
import { fetchCategories, fetchGuias } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Guias de compra: qual escolher em 2026",
  description:
    "Guias do Vetor.blog para diferentes necessidades, orçamentos e critérios de compra. Conteúdo amplo que leva aos reviews e comparativos.",
  alternates: { canonical: "https://www.vetor.blog/guias/" },
  openGraph: {
    title: "Guias de compra: qual escolher em 2026",
    description: "Critérios, perfis e alternativas antes de comprar.",
    url: "https://www.vetor.blog/guias/",
    type: "website",
    images: ["https://www.vetor.blog/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

export default async function GuiasPage() {
  const [guias, categories] = await Promise.all([fetchGuias(), fetchCategories()]);
  const guideCategories = categories
    .filter((category) => guias.some((guia) => guia.category.toLowerCase() === category.name.toLowerCase()))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <ItemListSchema
        items={guias.map((g) => ({
          name: g.product,
          url: `https://www.vetor.blog/reviews/${g.slug}/`,
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[{ label: "Início", href: "/" }, { label: "Guias" }]}
            />
            <span className="eyebrow">Guias Vetor</span>
            <h1>Guias de compra: qual escolher</h1>
            <p className="hero-lead">
              Conteúdo amplo para quem ainda está descobrindo a categoria — com critérios, perfis e links para
              os reviews completos.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="guide-intro">
              <div>
                <span className="eyebrow-small">Como usar os guias</span>
                <h2>Comece pelo que você precisa decidir</h2>
                <p>
                  Os guias reúnem opções por categoria e contexto de compra. Depois, avance para um review
                  individual para conferir critérios, especificações, pontos positivos e limitações.
                </p>
              </div>
              <div className="guide-intro-links">
                <Link href="/reviews/">Ver todos os reviews →</Link>
                <Link href="/comparativos/">Ver comparativos →</Link>
              </div>
            </div>

            {guideCategories.length > 0 && (
              <div className="guide-category-nav" aria-label="Categorias com guias">
                {guideCategories.slice(0, 8).map((category) => (
                  <Link key={category.name} href={`/reviews/categoria/${encodeURIComponent(category.name)}/`}>
                    <span>{category.name}</span>
                    <small>{category.count} {category.count === 1 ? "review" : "reviews"} →</small>
                  </Link>
                ))}
              </div>
            )}

            {guias.length > 0 ? (
              <div className="home-guide-grid">
                {guias.map((g, i) => (
                  <GuideCard key={g.slug} guia={g} index={i} />
                ))}
              </div>
            ) : (
              <div className="article">
                <h2>Nenhum guia publicado ainda</h2>
                <p>
                  Estamos preparando os primeiros guias. Enquanto isso, explore os{" "}
                  <Link href="/reviews/">reviews</Link> e{" "}
                  <Link href="/comparativos/">comparativos</Link>.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
