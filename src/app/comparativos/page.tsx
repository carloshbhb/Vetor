import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import SafeImage from "@/components/SafeImage";
import { safeImageSrc } from "@/lib/images";
import { ItemListSchema } from "@/components/SchemaMarkup";
import { fetchAllViralArticles } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comparativos de Produtos — Qual Vale Mais a Pena?",
  description:
    "Comparativos lado a lado de fones, smartwatches, celulares e outros produtos. Veja especificações, preços e o veredicto de cada disputa.",
  alternates: { canonical: "/comparativos/" },
};

export const dynamic = "force-dynamic";

export default async function ComparativosPage() {
  const articles = await fetchAllViralArticles();

  return (
    <>
      <ItemListSchema
        items={articles.map((a) => ({
          name: a.title,
          url: `/comparativos/${a.slug}/`,
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Comparativos" }]} />
            <span className="eyebrow">Comparativos</span>
            <h1>Comparativos</h1>
            <p className="hero-lead">Veja qual produto leva vantagem em cada categoria.</p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            {articles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>
                  Nenhum comparativo disponível no momento.
                </p>
              </div>
            ) : (
              <div className="comparison-card-grid">
                {articles.map((article) => (
                  <article key={article.slug} className="comparison-card">
                    <Link href={"/comparativos/" + article.slug + "/"} className="comparison-card-media">
                      <SafeImage
                        src={safeImageSrc(article.hero.imageUrl)}
                        width={600}
                        height={400}
                        alt={article.title}
                        loading="lazy"
                        sizes="(max-width: 720px) 100vw, 50vw"
                      />
                    </Link>
                    <div className="comparison-card-body">
                      <span className="tag">{article.category}</span>
                      <h2>{article.title}</h2>
                      <p>{article.description}</p>
                      <div className="comparison-card-footer">
                        <span>Comparação lado a lado</span>
                        <Link href={"/comparativos/" + article.slug + "/"}>Ver comparativo →</Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
                    <span className="home-arrow">→</span>
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
