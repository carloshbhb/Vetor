import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
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
