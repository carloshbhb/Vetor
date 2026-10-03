import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { fetchCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Categorias de Reviews — Wearables, Fones, Notebooks e Mais",
  description:
    "Navegue por todas as categorias de reviews do vetor.blog: wearables, fones de ouvido, notebooks, casa inteligente e mais.",
  alternates: { canonical: "/reviews/categoria" },
};

export default async function CategoriesIndexPage() {
  const categories = await fetchCategories();

  return (
    <>
      <BreadcrumbSchema items={[{ name: "Início", url: "https://www.vetor.blog/" }, { name: "Reviews", url: "https://www.vetor.blog/reviews/" }, { name: "Categorias", url: "https://www.vetor.blog/reviews/categoria/" }]} />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews" },
                { label: "Categorias" },
              ]}
            />
            <span className="eyebrow">Categorias</span>
            <h1>Todas as categorias</h1>
            <p className="hero-lead">
              Escolha uma categoria e veja todos os reviews independentes do vetor.blog.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="buying-guide-intro">
              <div><span className="eyebrow-small">Comparação de compra</span><h2>Quer ir além dos reviews individuais?</h2><p>Os guias do Vetor reúnem produtos já analisados e organizam a pesquisa por categoria e intenção de compra.</p></div>
              <Link className="cta" href="/melhores/">Abrir guias de compra →</Link>
            </div>
            {categories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>
                  Nenhuma categoria disponível no momento.
                </p>
              </div>
            ) : (
              <div className="home-guide-grid">
                {categories.map((cat) => (
                  <a
                    key={cat.name}
                    className="home-guide"
                    href={`/reviews/categoria/${encodeURIComponent(cat.name)}`}
                  >
                    <span className="home-guide-num">
                      {cat.count} review{cat.count === 1 ? "" : "s"}
                    </span>
                    <h3>{cat.name}</h3>
                    <p>Análises independentes da categoria.</p>
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
