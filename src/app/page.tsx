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
        <section className="min-h-[90vh] flex items-center" style={{ background: "linear-gradient(to bottom, var(--surface), transparent)" }}>
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <p className="font-heading text-sm font-bold text-amber mb-4 tracking-wider uppercase">
                Reviews Sinceros e Imparciais
              </p>
              <h1 className="font-display leading-[0.93] mb-6" style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}>
                Pare de comprar{" "}
                <span className="text-amber">no escuro.</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed mb-8 font-light">
                Análises detalhadas com dados reais para você fazer a melhor
                escolha. Sem enrolação, sem favoritismo.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <a
                  href="#reviews"
                  className="bg-amber text-black font-heading font-extrabold px-8 py-4 rounded-full hover:bg-white hover:shadow-[0_16px_40px_rgba(245,158,11,0.3)] transition-all text-base"
                >
                  Ver Melhores Reviews
                </a>
                <a
                  href="/reviews"
                  className="border border-border text-text font-heading font-bold px-8 py-4 rounded-full hover:bg-surface transition-colors text-base"
                >
                  Todos os Reviews
                </a>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted">
                <div className="flex items-center gap-2">
                  <span className="text-green">✓</span> +100 Reviews Publicados
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green">✓</span> Dados Reais de Preço
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green">✓</span> Comparativos Detalhados
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP RATED */}
        {topReviews.length > 0 && (
          <section id="reviews" className="py-16" style={{ background: "rgba(13,18,32,0.3)" }}>
            <div className="container">
              <div className="text-center mb-12">
                <p className="font-heading text-sm font-bold text-amber mb-2 tracking-wider uppercase">
                  Nota 9.0+
                </p>
                <h2 className="font-display leading-none mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>
                  MELHORES AVALIADOS
                </h2>
                <p className="text-muted max-w-xl mx-auto font-light">
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
          <section className="py-16">
            <div className="container">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="font-heading text-sm font-bold text-amber mb-1 tracking-wider uppercase">
                    Recentes
                  </p>
                  <h2 className="font-display leading-none" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>
                    ÚLTIMOS REVIEWS
                  </h2>
                </div>
                <a
                  href="/reviews"
                  className="text-sm text-amber hover:underline hidden sm:block font-heading font-semibold"
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
          <section className="py-16" style={{ background: "rgba(13,18,32,0.5)" }}>
            <div className="container">
              <h2 className="font-display leading-none mb-8" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>
                CATEGORIAS
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <a
                    key={cat.name}
                    href={`/reviews?category=${encodeURIComponent(cat.name)}`}
                    className="bg-surface border border-border rounded-xl p-5 hover:border-amber/30 transition-colors group"
                  >
                    <div className="font-display text-amber text-3xl font-bold mb-1 group-hover:scale-105 transition-transform origin-left">
                      {cat.count}
                    </div>
                    <div className="text-sm text-muted font-heading font-semibold">
                      {cat.name}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="font-display leading-none mb-4" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>
                PRONTO PARA ESCOLHER COM CONFIANÇA?
              </h2>
              <p className="text-muted mb-8 font-light">
                Acesse nossos reviews completos e encontre o melhor preço.
              </p>
              <a
                href="/reviews"
                className="inline-block bg-amber text-black font-heading font-extrabold px-8 py-4 rounded-full hover:bg-white hover:shadow-[0_16px_40px_rgba(245,158,11,0.3)] transition-all text-base"
              >
                Explorar Todos os Reviews
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}