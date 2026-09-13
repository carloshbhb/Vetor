import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import { fetchAllReviews, fetchCategories } from "@/lib/data";

export default async function Home() {
  const [reviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

  const latestReviews = reviews.slice(0, 4);

  return (
    <>
      <Navbar />
      <main>
        <section className="min-h-[80vh] flex items-center">
          <div className="container">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-[var(--blue)] mb-4 tracking-wider uppercase">
                Reviews & Comparativos
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-6">
                Escolha com{" "}
                <span className="text-[var(--blue)]">confiança.</span>
              </h1>
              <p className="text-lg sm:text-xl text-[var(--muted)] max-w-xl leading-relaxed mb-8">
                Reviews profissionais, comparativos detalhados e recomendações
                de compra para você fazer a melhor escolha.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/reviews"
                  className="bg-[var(--blue)] text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
                >
                  Ver Reviews
                </a>
                <a
                  href="/reviews?category=comparativos"
                  className="border border-white/15 text-[var(--text)] font-semibold px-6 py-3 rounded-xl hover:bg-[var(--surface)] transition-colors text-sm"
                >
                  Comparativos
                </a>
              </div>
            </div>
          </div>
        </section>

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

        {categories.length > 0 && (
          <section className="py-16 bg-[var(--surface)]/50">
            <div className="container">
              <h2 className="text-2xl sm:text-3xl font-bold mb-8">
                Dados de Mercado
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

        <section className="py-16">
          <div className="container text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Receba Reviews no seu Email
            </h2>
            <p className="text-[var(--muted)] max-w-md mx-auto mb-6">
              Cadastre-se e fique por dentro dos melhores reviews e
              comparativos.
            </p>
            <form
              className="flex gap-2 max-w-md mx-auto"
            >
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
