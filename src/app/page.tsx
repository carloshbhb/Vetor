import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { fetchAllReviews, fetchCategories, fetchAllViralArticles } from "@/lib/data";

export const revalidate = 300;

export default async function Home() {
  const [reviews, categories, viralArticles] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
    fetchAllViralArticles(),
  ]);

  const latestReviews = reviews.slice(0, 8);
  const topReviews = reviews.filter((r) => r.verdict_score >= 9).slice(0, 4);

  // Filter for P1 comparison articles
  const p1Comparativos = viralArticles.filter((a) =>
    a.title.toLowerCase().includes("melhor") &&
    (a.title.toLowerCase().includes("custo-benefício") || a.title.toLowerCase().includes("bluetooth"))
  ).slice(0, 3);

  return (
    <>
      <Navbar />
      <main>
        {/* HERO - Optimized for ML Message Match */}
        <section className="hero" style={{ minHeight: "90vh", display: "flex", alignItems: "center" }}>
          <div className="hero-left" style={{ maxWidth: 800, margin: "0 auto", textAlign: "center", padding: "64px 32px 0" }}>
            <span className="sec-label">Melhores Preços no Mercado Livre</span>
            <h1 className="sec-h" style={{ fontSize: "clamp(3rem, 8vw, 7rem)", marginBottom: 24 }}>
              Encontre o <span style={{ color: "var(--blue)" }}>Menor Preço</span> no ML
            </h1>
            <p style={{ fontSize: "1.15rem", color: "var(--body)", maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.8, fontWeight: 300 }}>
              Reviews sinceros com links diretos para o Mercado Livre. Comparamos
              preços em tempo real para você economizar de verdade.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 48 }}>
              <a href="#reviews" className="btn-cta">Ver Menor Preço no ML →</a>
              <a href="/comparativos" className="btn-sec">Comparativos 2026</a>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, fontSize: "0.88rem", color: "var(--muted)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--green)" }}>✓</span> Preços Atualizados no ML
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--green)" }}>✓</span> Links de Afiliado Diretos
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--green)" }}>✓</span> Comparativos Custo-Benefício
              </div>
            </div>
          </div>
        </section>

        {/* TOP RATED */}
        {topReviews.length > 0 && (
          <section id="reviews" className="scores-band">
            <div className="scores-inner">
              <div style={{ textAlign: "center", marginBottom: 48 }}>
                <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Nota 9.0+</span>
                <h2 className="sec-h" style={{ color: "#fff" }}>MELHORES AVALIADOS</h2>
                <p style={{ color: "rgba(255,255,255,0.55)", maxWidth: 560, margin: "0 auto", fontWeight: 300 }}>
                  Os produtos com as maiores notas do nosso laboratório de análises.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {topReviews.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* LATEST REVIEWS */}
        {latestReviews.length > 0 && (
          <section className="content">
            <div className="container">
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                  <span className="sec-label">Recentes</span>
                  <h2 className="sec-h" style={{ marginBottom: 0 }}>ÚLTIMOS REVIEWS</h2>
                </div>
                <a href="/reviews" className="btn-sec">Ver todos →</a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {latestReviews.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CATEGORIES */}
        {categories.length > 0 && (
          <section className="faq-sec">
            <div className="faq-inner">
              <h2 className="sec-h">CATEGORIAS</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" style={{ marginTop: 36 }}>
                {categories.map((cat) => (
                  <a
                    key={cat.name}
                    href={`/reviews/categoria/${encodeURIComponent(cat.name)}`}
                    style={{
                      display: "block", background: "var(--bg)",
                      border: "1.5px solid var(--border)", borderRadius: 10,
                      padding: 20, textDecoration: "none", transition: "border-color 0.15s",
                    }}
                  >
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", color: "var(--blue)", fontSize: "1.8rem", fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>
                      {cat.count}
                    </div>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: "0.82rem", fontWeight: 700, color: "var(--muted)" }}>
                      {cat.name}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* P1 COMPARATIVOS - High Priority SEO Articles */}
        {p1Comparativos.length > 0 && (
          <section className="content" style={{ background: "var(--surface)" }}>
            <div className="container">
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                  <span className="sec-label" style={{ color: "var(--blue)", borderBottomColor: "var(--blue)" }}>PRIORIDADE MÁXIMA</span>
                  <h2 className="sec-h" style={{ marginBottom: 0 }}>COMPARATIVOS CUSTO-BENEFÍCIO 2026</h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {p1Comparativos.map((article) => (
                  <a
                    key={article.slug}
                    href={`/comparativos/${article.slug}`}
                    style={{
                      display: "block",
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      borderRadius: 12,
                      padding: 24,
                      textDecoration: "none",
                      transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--blue)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "var(--box-shadow-sm)";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-heading)", fontSize: "0.75rem", fontWeight: 700, color: "var(--blue)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      {article.category}
                    </div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.3, marginBottom: 12 }}>
                      {article.title}
                    </h3>
                    <p style={{ fontSize: "0.88rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {article.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--cta)", fontFamily: "var(--font-heading)" }}>
                        Ver Comparativo →
                      </span>
                      {article.hero?.bars && article.hero.bars.length > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--green)", fontWeight: 600 }}>
                          {article.hero.bars.length} produtos comparados
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA - ML Focused */}
        <section className="content" style={{ textAlign: "center" }}>
          <div className="container">
            <h2 className="sec-h">PRONTO PARA ECONOMIZAR NO MERCADO LIVRE?</h2>
            <p style={{ color: "var(--body)", fontWeight: 300, marginBottom: 32 }}>
              Acesse nossos reviews e comparativos com links diretos para o menor preço no ML.
            </p>
            <a href="/comparativos" className="btn-cta">Ver Comparativos Custo-Benefício →</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
