import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ReviewCard from "@/components/ReviewCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchAllReviews, fetchCategories } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const [reviews, categories] = await Promise.all([
    fetchAllReviews(),
    fetchCategories(),
  ]);

  return (
    <>
      <Navbar />
      <main>
        <section className="hero" style={{ minHeight: "auto", paddingBottom: 0 }}>
          <div className="hero-left" style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 32px 48px" }}>
            <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Reviews" }]} />
            <span className="sec-label">Reviews</span>
            <h1 className="font-display" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", lineHeight: 0.95, color: "var(--ink)", marginBottom: 12 }}>
              TODOS OS REVIEWS
            </h1>
            <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "1.05rem", maxWidth: 560 }}>
              Análises detalhadas para você escolher com confiança.
            </p>
          </div>
        </section>

        <section style={{ padding: "48px 32px 72px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 36 }}>
                <a href="/reviews" style={{
                  display: "inline-block", padding: "8px 18px", borderRadius: 6,
                  fontFamily: "'Syne',sans-serif", fontSize: "0.78rem", fontWeight: 700,
                  background: "var(--blue)", color: "#fff", textDecoration: "none",
                }}>
                  Todos ({reviews.length})
                </a>
                {categories.map((cat) => (
                  <a
                    key={cat.name}
                    href={`/reviews?category=${encodeURIComponent(cat.name)}`}
                    style={{
                      display: "inline-block", padding: "8px 18px", borderRadius: 6,
                      fontFamily: "'Syne',sans-serif", fontSize: "0.78rem", fontWeight: 700,
                      background: "var(--surface)", color: "var(--body)",
                      border: "1.5px solid var(--border)", textDecoration: "none",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {cat.name} ({cat.count})
                  </a>
                ))}
              </div>
            )}

            {reviews.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <p style={{ color: "var(--muted)", fontSize: "1.05rem" }}>Nenhum review encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {reviews.map((review) => (
                  <ReviewCard key={review.slug} review={review} />
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
