import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import ScoreBadge from "@/components/ScoreBadge";
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
        {/* Hero Section - Sales Page Style */}
        <section className="min-h-[90vh] flex items-center bg-gradient-to-b from-[var(--surface)] to-transparent">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-sm font-medium text-[var(--blue)] mb-4 tracking-wider uppercase">
                Reviews Sinceros e Imparciais
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-6">
                Pare de comprar{" "}
                <span className="text-[var(--blue)]">no escuro.</span>
              </h1>
              <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed mb-8">
                Análises detalhadas com dados reais para você fazer a melhor
                escolha. Sem enrolação, sem favoritismo.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <a
                  href="#reviews"
                  className="bg-[var(--blue)] text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-base"
                >
                  Ver Melhores Reviews
                </a>
                <a
                  href="/reviews"
                  className="border border-white/15 text-[var(--text)] font-semibold px-8 py-4 rounded-xl hover:bg-[var(--surface)] transition-colors text-base"
                >
                  Todos os Reviews
                </a>
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--muted)]">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--green)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  +100 Reviews Publicados
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--green)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Dados Reais de Preço
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--green)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Comparativos Detalhados
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Top Rated Reviews - Affiliate Focus */}
        {topReviews.length > 0 && (
          <section id="reviews" className="py-16 bg-[var(--surface)]/30">
            <div className="container">
              <div className="text-center mb-12">
                <p className="text-sm font-medium text-[var(--blue)] mb-2 tracking-wider uppercase">
                  Nota 9.0+
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Melhores Avaliados
                </h2>
                <p className="text-[var(--muted)] max-w-xl mx-auto">
                  Os produtos com as maiores notas do nosso laboratório de análises.
                  Clique e confira o menor preço.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {topReviews.map((review) => (
                  <a
                    key={review.slug}
                    href={review.affiliate_url || `/reviews/${review.slug}`}
                    target={review.affiliate_url ? "_blank" : undefined}
                    rel={review.affiliate_url ? "noopener noreferrer" : undefined}
                    className="group bg-[var(--surface)] border border-white/8 rounded-2xl overflow-hidden hover:border-[var(--blue)]/40 transition-all hover:shadow-lg hover:shadow-[var(--blue)]/5"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <ScoreBadge score={review.verdict_score} />
                        <span className="text-xs text-[var(--muted)] bg-[var(--surface3)] px-2 py-1 rounded-full">
                          {review.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg mb-2 group-hover:text-[var(--blue)] transition-colors line-clamp-2">
                        {review.product}
                      </h3>
                      <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
                        {review.hero_lead}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-[var(--green)]">
                            {review.price_new}
                          </p>
                          {review.price_old && (
                            <p className="text-xs text-[var(--muted)] line-through">
                              {review.price_old}
                            </p>
                          )}
                        </div>
                        <span className="bg-[var(--blue)] text-white text-xs font-semibold px-3 py-2 rounded-lg group-hover:opacity-90 transition-opacity">
                          Ver Oferta →
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Latest Reviews */}
        {latestReviews.length > 0 && (
          <section className="py-16">
            <div className="container">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    Últimos Reviews
                  </h2>
                  <p className="text-[var(--muted)] mt-1">
                    Análises atualizadas dos produtos mais relevantes
                  </p>
                </div>
                <a
                  href="/reviews"
                  className="text-sm text-[var(--blue)] hover:underline hidden sm:block"
                >
                  Ver todos →
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {latestReviews.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
                ))}
              </div>
              <a
                href="/reviews"
                className="text-sm text-[var(--blue)] hover:underline mt-6 block text-center sm:hidden"
              >
                Ver todos os reviews →
              </a>
            </div>
          </section>
        )}

        {/* Categories / Market Data */}
        {categories.length > 0 && (
          <section className="py-16 bg-[var(--surface)]/50">
            <div className="container">
              <h2 className="text-2xl sm:text-3xl font-bold mb-8">
                Categorias
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <a
                    key={cat.name}
                    href={`/reviews?category=${encodeURIComponent(cat.name)}`}
                    className="bg-[var(--surface)] border border-white/5 rounded-xl p-5 hover:border-[var(--blue)]/30 transition-colors group"
                  >
                    <div className="text-3xl font-bold text-[var(--blue)] mb-1 group-hover:scale-105 transition-transform origin-left">
                      {cat.count}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {cat.name}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Final - Sales Page Style */}
        <section className="py-20">
          <div className="container text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para escolher com confiança?
              </h2>
              <p className="text-[var(--muted)] mb-8">
                Acesse nossos reviews completos e encontre o melhor preço para o
                produto que você precisa.
              </p>
              <a
                href="/reviews"
                className="inline-block bg-[var(--blue)] text-white font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-opacity text-base"
              >
                Explorar Todos os Reviews
              </a>
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section className="py-16 bg-[var(--surface)]/50">
          <div className="container text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Receba Reviews no seu Email
            </h2>
            <p className="text-[var(--muted)] max-w-md mx-auto mb-6">
              Cadastre-se e fique por dentro dos melhores reviews e
              comparativos.
            </p>
            <form className="flex gap-2 max-w-md mx-auto">
              <input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 bg-[var(--surface)] border border-white/8 rounded-xl px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--blue)]"
              />
              <button
                type="submit"
                className="bg-[var(--blue)] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Cadastrar
              </button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
