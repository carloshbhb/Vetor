import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { fetchAllReviews, fetchCategories } from "@/lib/data";

export default async function Home() {
  const [reviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

  const latestReviews = reviews.slice(0, 8);
  const topReviews = reviews.filter((r) => r.verdict_score >= 9).slice(0, 4);

  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className="hero" style={{ minHeight: "90vh", display: "flex", alignItems: "center" }}>
          <div className="hero-inner" style={{ gridTemplateColumns: "1fr" }}>
            <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
              <span className="sec-label">Reviews Sinceros e Imparciais</span>
              <h1 className="font-display" style={{ fontSize: "clamp(3rem, 8vw, 7rem)", lineHeight: 0.93, marginBottom: 24, color: "var(--ink)" }}>
                Pare de comprar{" "}
                <span className="text-blue">no escuro.</span>
              </h1>
              <p style={{ fontSize: "1.15rem", color: "var(--body)", maxWidth: 640, margin: "0 auto 32px", lineHeight: 1.8, fontWeight: 300 }}>
                Análises detalhadas com dados reais para você fazer a melhor
                escolha. Sem enrolação, sem favoritismo.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginBottom: 48 }}>
                <a href="#reviews" className="btn-cta">
                  Ver Melhores Reviews
                </a>
                <a href="/reviews" className="btn-sec" style={{ padding: "15px 32px", border: "1.5px solid var(--border)", borderRadius: 6 }}>
                  Todos os Reviews
                </a>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, fontSize: "0.88rem", color: "var(--muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--green)" }}>✓</span> +100 Reviews Publicados
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--green)" }}>✓</span> Dados Reais de Preço
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--green)" }}>✓</span> Comparativos Detalhados
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP RATED */}
        {topReviews.length > 0 && (
          <section id="reviews" className="scores-band" style={{ padding: "64px 32px" }}>
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
          <section style={{ padding: "64px 32px" }}>
            <div className="scores-inner">
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                  <span className="sec-label">Recentes</span>
                  <h2 className="sec-h" style={{ marginBottom: 0 }}>ÚLTIMOS REVIEWS</h2>
                </div>
                <a
                  href="/reviews"
                  className="btn-sec"
                  style={{ fontSize: "0.88rem" }}
                >
                  Ver todos →
                </a>
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
                    href={`/reviews?category=${encodeURIComponent(cat.name)}`}
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

        {/* CTA */}
        <section style={{ padding: "80px 32px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
            <h2 className="sec-h">PRONTO PARA ESCOLHER COM CONFIANÇA?</h2>
            <p style={{ color: "var(--body)", fontWeight: 300, marginBottom: 32 }}>
              Acesse nossos reviews completos e encontre o melhor preço.
            </p>
            <a href="/reviews" className="btn-cta">
              Explorar Todos os Reviews
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
