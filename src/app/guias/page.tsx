import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import GuideCard from "@/components/GuideCard";
import { ItemListSchema } from "@/components/SchemaMarkup";
import { fetchGuias } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Guias de compra: qual escolher em 2026",
  description:
    "Guias do Vetor.blog para diferentes necessidades, orçamentos e critérios de compra. Conteúdo amplo que leva aos reviews e comparativos.",
  alternates: { canonical: "https://www.vetor.blog/guias" },
  openGraph: {
    title: "Guias de compra: qual escolher em 2026",
    description: "Critérios, perfis e alternativas antes de comprar.",
    url: "https://www.vetor.blog/guias",
    type: "website",
    images: ["https://www.vetor.blog/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

export default async function GuiasPage() {
  const guias = await fetchGuias();

  return (
    <>
      <ItemListSchema
        items={guias.map((g) => ({
          name: g.product,
          url: `https://www.vetor.blog/reviews/${g.slug}`,
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
