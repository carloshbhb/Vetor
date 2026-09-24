import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews" },
                { label: "Categorias" },
              ]}
            />
            <span className="sec-label">Categorias</span>
            <h1 className="sec-h">TODAS AS CATEGORIAS</h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Escolha uma categoria e veja todos os reviews independentes do vetor.blog.
            </p>
          </div>
        </section>

        <section className="content">
          <div className="container">
            {categories.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>
                  Nenhuma categoria disponível no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <a
                    key={cat.name}
                    href={`/reviews/categoria/${encodeURIComponent(cat.name)}`}
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
                      {cat.count}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Syne',sans-serif",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        color: "var(--muted)",
                      }}
                    >
                      {cat.name}
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
