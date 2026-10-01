import ReviewCard from "@/components/ReviewCard";
import SmoothScroll from "@/components/SmoothScroll";
import CustomCursor from "@/components/CustomCursor";
import NoiseOverlay from "@/components/NoiseOverlay";
import EntranceAnimations from "@/components/EntranceAnimations";
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

  const p1Comparativos = viralArticles.filter((a) =>
    a.title.toLowerCase().includes("melhor") &&
    (a.title.toLowerCase().includes("custo-benefício") || a.title.toLowerCase().includes("bluetooth"))
  ).slice(0, 3);

  return (
    <SmoothScroll>
      <NoiseOverlay opacity={0.025} />
      <CustomCursor />
      <main className="relative z-10">
        {/* HERO - Full-bleed with word-level animation */}
        <section 
          className="relative min-h-[90vh] flex items-end justify-center overflow-hidden"
          style={{ 
            background: "var(--surface)",
            borderBottom: "1.5px solid var(--border)",
          }}
        >
          {/* Ambient radial gradient */}
          <div 
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% -20%, rgba(31,108,159,0.06) 0%, transparent 70%),
                radial-gradient(ellipse 60% 40% at 80% 100%, rgba(149,100,0,0.04) 0%, transparent 60%)
              `
            }}
          />
          
          <div className="w-full max-w-7xl mx-auto px-8 pb-20">
            <div className="text-center" style={{ maxWidth: 800, margin: "0 auto" }}>
              {/* Staggered entrance words */}
              <div className="reveal-word" style={{ 
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(0.7rem, 1.5vw, 0.85rem)",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--blue)",
                marginBottom: 24,
                display: "flex",
                justifyContent: "center",
                gap: "8px"
              }}>
                <span className="word" style={{ 
                  opacity: 0, 
                  transform: "translateY(20px)", 
                  transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "100ms"
                }}>Melhores Preços</span>
                <span className="word" style={{ 
                  opacity: 0, 
                  transform: "translateY(20px)", 
                  transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "180ms"
                }}>no</span>
                <span className="word" style={{ 
                  opacity: 0, 
                  transform: "translateY(20px)", 
                  transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "260ms"
                }}>Mercado Livre</span>
              </div>

              <h1 className="reveal-word" style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(3.5rem, 9vw, 8.5rem)",
                fontWeight: 200,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
                color: "var(--ink)",
                marginBottom: 32,
                marginTop: -8
              }}>
                <span className="word" style={{ 
                  opacity: 0, 
                  transform: "translateY(30px)", 
                  transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "200ms",
                  display: "block"
                }}>Encontre o</span>
                <span className="word" style={{ 
                  opacity: 0, 
                  transform: "translateY(30px)", 
                  transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "280ms",
                  display: "block",
                  color: "var(--blue)"
                }}>Menor Preço</span>
                <span className="word" style={{ 
                  opacity: 0, 
                  transform: "translateY(30px)", 
                  transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "360ms",
                  display: "block"
                }}>no ML</span>
              </h1>

              <p className="reveal-word" style={{
                fontSize: "clamp(1.05rem, 1.8vw, 1.25rem)",
                color: "var(--body)",
                maxWidth: 680,
                margin: "32px auto 48px",
                lineHeight: 1.9,
                fontWeight: 300,
                opacity: 0,
                transform: "translateY(20px)",
                transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "500ms"
              }}>
                Reviews sinceros com links diretos para o Mercado Livre. Comparamos preços em tempo real para você economizar de verdade — sem enrolação, sem favoritismo.
              </p>

              {/* Magnetic CTAs */}
              <div className="reveal-word flex flex-wrap justify-center gap-4" style={{
                opacity: 0,
                transform: "translateY(20px)",
                transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "580ms"
              }}>
                <a 
                  href="/comparativos" 
                  className="btn-cta magnetic"
                  data-magnetic="true"
                  style={{
                    background: "var(--cta)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "18px 40px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    letterSpacing: "0.03em",
                    textDecoration: "none",
                    transition: "background 0.15s, transform 0.2s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    willChange: "transform",
                  }}
                  data-hover={JSON.stringify({ background: "var(--cta-dk)" })}
                  data-hover-base={JSON.stringify({ background: "var(--cta)" })}
                >
                  Ver Comparativos 2026
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
                <a 
                  href="/reviews" 
                  className="btn-sec magnetic"
                  data-magnetic="true"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--blue)",
                    textDecoration: "none",
                    borderBottom: "2px solid var(--blue)",
                    paddingBottom: "4px",
                    transition: "color 0.15s, border-color 0.15s",
                    willChange: "transform",
                  }}
                >
                  Explorar Reviews
                </a>
              </div>

              {/* Trust signals - staggered */}
              <div className="reveal-word flex flex-wrap justify-center gap-6 md:gap-10 mt-16" style={{
                fontSize: "0.85rem",
                color: "var(--muted)",
                opacity: 0,
                transform: "translateY(20px)",
                transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "700ms"
              }}>
                <div className="flex items-center gap-3" style={{ fontWeight: 300 }}>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: "var(--green-bg)", color: "var(--green)", fontSize: "0.75rem" }}>✓</span>
                  Preços atualizados no ML
                </div>
                <div className="flex items-center gap-3" style={{ fontWeight: 300 }}>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: "var(--blue-lt)", color: "var(--blue)", fontSize: "0.75rem" }}>↗</span>
                  Links de afiliado diretos
                </div>
                <div className="flex items-center gap-3" style={{ fontWeight: 300 }}>
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full" style={{ background: "rgba(149,100,0,0.1)", color: "var(--amber)", fontSize: "0.75rem" }}>★</span>
                  Comparativos custo-benefício
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bounce-slow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ opacity: 0.5 }}>
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </section>

        {/* WHO / CREDIBILITY BAND */}
        <section className="relative" style={{ background: "var(--ink)", color: "#fff", padding: "56px 32px" }}>
          <div className="max-w-7xl mx-auto">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "48px" }}>
              <div className="reveal" style={{ transitionDelay: "100ms" }}>
                <p style={{ 
                  fontFamily: "var(--font-heading)", 
                  fontSize: "0.75rem", 
                  fontWeight: 800, 
                  letterSpacing: "0.1em", 
                  color: "#93C5FD", 
                  marginBottom: "16px",
                  textTransform: "uppercase",
                  borderBottom: "2px solid #93C5FD",
                  display: "inline-block",
                  paddingBottom: "4px"
                }}>Por que confiar no vetor.blog</p>
                <h2 style={{ 
                  fontFamily: "var(--font-display)", 
                  fontSize: "clamp(2rem, 3.5vw, 3rem)", 
                  lineHeight: 1, 
                  marginBottom: "20px",
                  fontWeight: 200,
                  letterSpacing: "-0.03em"
                }}>Análises que economizam seu dinheiro</h2>
                <p style={{ 
                  color: "rgba(255,255,255,0.7)", 
                  fontSize: "1.05rem", 
                  fontWeight: 300, 
                  lineHeight: 1.8,
                  maxWidth: 480
                }}>Testamos, comparamos e ranqueamos produtos reais. Você vê o menor preço no Mercado Livre e decide com confiança.</p>
              </div>
              <ul style={{ listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                {[
                  { label: "+150 reviews publicados", icon: "📝" },
                  { label: "Preços atualizados diariamente", icon: "🔄" },
                  { label: "Links diretos ML com rastreamento", icon: "🔗" },
                  { label: "Zero patrocínio oculto", icon: "🛡️" },
                  { label: "Comparativos com 4+ produtos", icon: "⚖️" },
                  { label: "Indexação automática (IndexNow)", icon: "🚀" },
                ].map((item, i) => (
                  <li key={item.label} className="reveal" style={{ 
                    transitionDelay: `${200 + i * 80}ms`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                    transition: "border-color 0.2s, background 0.2s"
                  }}>
                    <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ fontWeight: 300, lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* TOP RATED - Bento Grid */}
        {topReviews.length > 0 && (
          <section id="reviews" className="relative py-24" style={{ background: "var(--bg)" }}>
            <div className="max-w-7xl mx-auto px-8">
              <div className="reveal text-center mb-20" style={{ transitionDelay: "100ms" }}>
                <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Nota 9.0+</span>
                <h2 className="sec-h" style={{ color: "var(--ink)", marginTop: "8px", marginBottom: "12px" }}>MELHORES AVALIADOS</h2>
                <p style={{ color: "var(--body)", maxWidth: 560, margin: "0 auto", fontWeight: 300, fontSize: "1.05rem" }}>
                  Os produtos com as maiores notas do nosso laboratório. Cada um testado a fundo.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ 
                // Bento grid: first item spans 2 cols on lg
              }}>
                {topReviews.map((review, i) => (
                  <div key={review.slug} className={`reveal ${i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`} style={{ 
                    transitionDelay: `${100 + i * 80}ms`,
                  }}>
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* P1 COMPARATIVOS - Scroll Narrative */}
        {p1Comparativos.length > 0 && (
          <section className="relative py-24" style={{ background: "var(--surface)" }}>
            <div className="max-w-7xl mx-auto px-8">
              <div className="reveal mb-16" style={{ transitionDelay: "100ms" }}>
                <span className="sec-label" style={{ color: "var(--blue)", borderBottomColor: "var(--blue)" }}>PRIORIDADE MÁXIMA</span>
                <h2 className="sec-h" style={{ marginTop: "8px" }}>COMPARATIVOS CUSTO-BENEFÍCIO 2026</h2>
              </div>
              
              {/* Horizontal scroll narrative on desktop */}
              <div className="relative">
                <div 
                  className="flex gap-6 overflow-x-auto scroll-smooth pb-8 snap-x"
                  style={{ 
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--border) transparent",
                    WebkitOverflowScrolling: "touch",
                    scrollSnapType: "x mandatory",
                    scrollPadding: "0 32px",
                    margin: "0 -8px",
                    padding: "0 8px 32px",
                  }}
                >
                  {p1Comparativos.map((article, i) => (
                    <a
                      key={article.slug}
                      href={`/comparativos/${article.slug}`}
                      className="reveal flex-shrink-0 snap-start magnetic"
                      data-magnetic="true"
                      style={{
                        transitionDelay: `${100 + i * 100}ms`,
                        width: "360px",
                        maxWidth: "calc(100vw - 64px)",
                        scrollSnapAlign: "start",
                        display: "block",
                        background: "var(--bg)",
                        border: "1.5px solid var(--border)",
                        borderRadius: "16px",
                        padding: "32px",
                        textDecoration: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                        willChange: "transform, box-shadow, border-color",
                      }}
                      data-hover={JSON.stringify({
                        "border-color": "var(--blue)",
                        "box-shadow": "0 8px 32px rgba(0,0,0,0.08)",
                        transform: "translateY(-4px)",
                      })}
                      data-hover-base={JSON.stringify({
                        "border-color": "var(--border)",
                        "box-shadow": "none",
                        transform: "translateY(0)",
                      })}
                    >
                      <div style={{ 
                        fontFamily: "var(--font-heading)", 
                        fontSize: "0.68rem", 
                        fontWeight: 700, 
                        color: "var(--blue)", 
                        textTransform: "uppercase", 
                        letterSpacing: "0.1em", 
                        marginBottom: "12px" 
                      }}>
                        {article.category}
                      </div>
                      <h3 style={{ 
                        fontFamily: "var(--font-display)", 
                        fontSize: "1.35rem", 
                        fontWeight: 500, 
                        color: "var(--ink)", 
                        lineHeight: 1.25, 
                        marginBottom: "16px" 
                      }}>
                        {article.title}
                      </h3>
                      <p style={{ 
                        fontSize: "0.92rem", 
                        color: "var(--muted)", 
                        lineHeight: 1.7, 
                        marginBottom: "24px",
                        display: "-webkit-box",
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {article.description}
                      </p>
                      
                      {/* Product preview bar */}
                      {article.hero?.bars && article.hero.bars.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6" style={{ maxHeight: "80px", overflow: "hidden" }}>
                          {article.hero.bars.slice(0, 4).map((bar: any, bi: number) => (
                            <div key={bar.label} className="flex items-center gap-2" style={{ 
                              background: "var(--surface)", 
                              border: "1px solid var(--border)", 
                              borderRadius: "8px", 
                              padding: "8px 12px",
                              flexShrink: 0,
                              transition: "border-color 0.2s"
                            }}>
                              {bar.imageUrl && (
                                <img src={bar.imageUrl} alt={bar.label} className="w-10 h-10 object-cover rounded" style={{ border: "1px solid var(--border)" }} onError={(e) => { e.currentTarget.src = "/images/placeholder.svg"; }} />
                              )}
                              <div>
                                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "140px" }}>
                                  {bar.label}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--green)", fontWeight: 600, fontFamily: "var(--font-heading)" }}>
                                  {bar.value}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                        <span style={{ 
                          fontSize: "0.82rem", 
                          fontWeight: 700, 
                          color: "var(--cta)", 
                          fontFamily: "var(--font-heading)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px"
                        }}>
                          Ver Comparativo
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </span>
                        {article.hero?.bars && article.hero.bars.length > 0 && (
                          <span style={{ fontSize: "0.7rem", color: "var(--green)", fontWeight: 600, fontFamily: "var(--font-heading)" }}>
                            {article.hero.bars.length} produtos
                          </span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
                
                {/* Scroll hint */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-full pointer-events-none" style={{
                  background: "linear-gradient(to right, transparent, var(--surface))",
                  opacity: 0.8,
                }} />
              </div>
            </div>
          </section>
        )}

        {/* LATEST REVIEWS - Staggered Grid */}
        {latestReviews.length > 0 && (
          <section className="relative py-24" style={{ background: "var(--bg)" }}>
            <div className="max-w-7xl mx-auto px-8">
              <div className="reveal flex flex-col sm:flex-row sm:items-end sm:justify-between mb-16" style={{ transitionDelay: "100ms", gap: "24px" }}>
                <div>
                  <span className="sec-label">Recentes</span>
                  <h2 className="sec-h" style={{ marginTop: "8px" }}>ÚLTIMOS REVIEWS</h2>
                </div>
                <a href="/reviews" className="btn-sec magnetic" data-magnetic="true" style={{ alignSelf: "flex-end", willChange: "transform" }}>Ver todos →</a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {latestReviews.map((review, i) => (
                  <div key={review.slug} className="reveal" style={{ transitionDelay: `${100 + i * 80}ms` }}>
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CATEGORIES - Interactive Cards */}
        {categories.length > 0 && (
          <section className="relative py-24" style={{ background: "var(--surface)" }}>
            <div className="max-w-7xl mx-auto px-8">
              <div className="reveal text-center mb-16" style={{ transitionDelay: "100ms" }}>
                <h2 className="sec-h">CATEGORIAS</h2>
                <p style={{ color: "var(--body)", maxWidth: 560, margin: "16px auto 0", fontWeight: 300, fontSize: "1.05rem" }}>
                  Explore reviews por categoria. Cada produto testado com dados reais de preço no Mercado Livre.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {categories.map((cat, i) => (
                  <a
                    key={cat.name}
                    href={`/reviews/categoria/${encodeURIComponent(cat.name)}`}
                    className="reveal group relative overflow-hidden magnetic"
                    data-magnetic="true"
                    style={{ 
                      transitionDelay: `${100 + i * 60}ms`,
                      display: "block",
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      borderRadius: "14px",
                      padding: "28px 24px",
                      textDecoration: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s, background 0.2s",
                      willChange: "transform, box-shadow, border-color, background",
                    }}
                    data-hover={JSON.stringify({
                      "border-color": "var(--blue)",
                      "box-shadow": "0 12px 40px rgba(0,0,0,0.08)",
                      transform: "translateY(-6px) scale(1.01)",
                      background: "var(--surface)",
                    })}
                    data-hover-base={JSON.stringify({
                      "border-color": "var(--border)",
                      "box-shadow": "none",
                      transform: "translateY(0)",
                      background: "var(--bg)",
                    })}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ 
                      background: "linear-gradient(135deg, var(--blue-lt) 0%, transparent 60%)",
                      borderRadius: "14px"
                    }} />
                    <div className="relative z-10">
                      <div style={{ 
                        fontFamily: "var(--font-display)", 
                        color: "var(--blue)", 
                        fontSize: "clamp(2rem, 4vw, 3rem)", 
                        fontWeight: 700, 
                        lineHeight: 1, 
                        marginBottom: "8px",
                        letterSpacing: "-0.02em"
                      }}>
                        {cat.count}
                      </div>
                      <div style={{ 
                        fontFamily: "var(--font-heading)", 
                        fontSize: "0.85rem", 
                        fontWeight: 700, 
                        color: "var(--ink)", 
                        letterSpacing: "0.01em",
                        textTransform: "uppercase"
                      }}>
                        {cat.name}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FINAL CTA - Full width with ambient glow */}
        <section className="relative py-24 overflow-hidden" style={{ background: "var(--ink)" }}>
          <div className="absolute inset-0 -z-10" style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% 50%, rgba(31,108,159,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 20% 80%, rgba(149,100,0,0.08) 0%, transparent 60%)
            `
          }} />
          <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
            <div className="reveal" style={{ transitionDelay: "100ms" }}>
              <h2 className="sec-h" style={{ color: "#fff", marginBottom: "16px" }}>PRONTO PARA ECONOMIZAR NO MERCADO LIVRE?</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", fontWeight: 300, marginBottom: "40px", fontSize: "1.1rem", lineHeight: 1.8, maxWidth: 600, margin: "16px auto 40px" }}>
                Acesse nossos reviews e comparativos com links diretos para o menor preço no ML. Sua próxima compra começa aqui.
              </p>
              <a 
                href="/comparativos" 
                className="btn-cta magnetic inline-flex"
                data-magnetic="true"
                style={{
                  background: "var(--amber)",
                  color: "#111",
                  border: "none",
                  borderRadius: "6px",
                  padding: "20px 48px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: "1rem",
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                  transition: "background 0.15s, transform 0.2s, box-shadow 0.2s",
                  willChange: "transform",
                  boxShadow: "0 4px 24px rgba(149,100,0,0.3)",
                }}
                data-hover={JSON.stringify({
                  background: "#B8860B",
                  "box-shadow": "0 8px 32px rgba(149,100,0,0.4)",
                })}
                data-hover-base={JSON.stringify({
                  background: "var(--amber)",
                  "box-shadow": "0 4px 24px rgba(149,100,0,0.3)",
                })}
              >
                Ver Comparativos Custo-Benefício →
              </a>
            </div>
          </div>
        </section>
      </main>
      <EntranceAnimations />
    </SmoothScroll>
  );
}