import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Breadcrumbs from '@/components/Breadcrumbs';
import { fetchAllViralArticles } from '@/lib/data';

export const dynamic = "force-dynamic";

export default async function ComparativosPage() {
  const articles = await fetchAllViralArticles();

  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Comparativos" }]} />
            <span className="sec-label" style={{ color: "var(--amber)", borderBottomColor: "var(--amber)" }}>Comparativos</span>
            <h1 className="font-display" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 0.95, color: "var(--ink)", marginBottom: 12 }}>
              COMPARATIVOS
            </h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Veja qual produto leva vantagem em cada categoria.
            </p>
          </div>
        </section>

        <section style={{ padding: "48px 32px 72px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {articles.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>Nenhum comparativo disponível no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {articles.map((article) => (
                  <a
                    key={article.slug}
                    href={`/comparativos/${article.slug}`}
                    style={{
                      display: "block", background: "var(--bg)",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      overflow: "hidden", transition: "all 0.3s", textDecoration: "none",
                    }}
                  >
                    <div style={{ padding: 24 }}>
                      <span style={{
                        display: "inline-block", background: "var(--blue)", color: "#fff",
                        fontFamily: "'Syne',sans-serif", fontSize: "0.68rem", fontWeight: 700,
                        padding: "4px 12px", borderRadius: 20, letterSpacing: "0.04em", marginBottom: 12,
                      }}>
                        {article.category}
                      </span>
                      <h2 style={{
                        fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "1rem",
                        color: "var(--ink)", marginBottom: 8, lineHeight: 1.4,
                      }}>
                        {article.title}
                      </h2>
                      <p style={{
                        fontSize: "0.82rem", color: "var(--muted)", fontWeight: 300,
                        lineHeight: 1.6, marginBottom: 16,
                        overflow: "hidden", textOverflow: "ellipsis",
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                      }}>
                        {article.description}
                      </p>
                      {article.hero?.bars && article.hero.bars.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {article.hero.bars.slice(0, 3).map((bar) => (
                            <span key={bar.label} style={{
                              background: "var(--surface)", border: "1px solid var(--border)",
                              borderRadius: 6, padding: "5px 12px",
                              fontFamily: "'Syne',sans-serif", fontSize: "0.72rem", fontWeight: 700,
                              color: "var(--body)",
                            }}>
                              {bar.label} {bar.value}
                            </span>
                          ))}
                        </div>
                      )}
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
