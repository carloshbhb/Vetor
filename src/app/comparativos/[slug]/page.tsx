import SafeImage from "@/components/SafeImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import AuthorBox from "@/components/AuthorBox";
import ScoreBadge from "@/components/ScoreBadge";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { fetchViralArticleBySlug, fetchAllViralArticles } from "@/lib/data";
import { sanitizeHtml } from "@/lib/sanitize";
import { generateViralArticleSchema } from "@/lib/seo";
import type { ViralArticle } from '@/lib/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchViralArticleBySlug(slug);
  if (!article) return { title: "Comparativo não encontrado" };
  const url = `https://www.vetor.blog/comparativos/${article.slug}`;
  const title = article.title.includes("Comparativo") ? article.title : `Comparativo: ${article.title}`;
  const description =
    article.description ||
    `Comparativo ${article.title}: especificações, preços e veredicto para escolher o melhor produto.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: article.hero?.imageUrl ? [article.hero.imageUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ViralArticlePage({
  params,
}: PageProps) {
  const { slug } = await params;
  const article = await fetchViralArticleBySlug(slug);

  if (!article) notFound();

  const related = await fetchAllViralArticles();
  const relatedFiltered = related.filter((a) => a.slug !== article.slug).slice(0, 2);

  const articleSchema = generateViralArticleSchema(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Comparativos', url: 'https://www.vetor.blog/comparativos' },
          { name: article.title, url: `https://www.vetor.blog/comparativos/${article.slug}` },
        ]}
      />
      <Navbar />
      <main style={{ minHeight: "100vh" }}>
        <Breadcrumbs
          items={[
            { label: 'Comparativos', href: '/comparativos' },
            { label: article.title },
          ]}
        />

        {/* Hero Section - Full bleed with pinned scroll narrative */}
        <section className="relative" style={{ 
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          background: "var(--surface)",
          borderBottom: "1.5px solid var(--border)",
          overflow: "hidden",
        }}>
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 -z-10" style={{
            background: `
              radial-gradient(ellipse 70% 50% at 20% 20%, rgba(31,108,159,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 80% 80%, rgba(149,100,0,0.05) 0%, transparent 50%)
            `
          }} />

          <div className="w-full max-w-7xl mx-auto px-8 py-20 relative z-10" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {/* Staggered word entrance */}
            <div className="reveal-word mb-8" style={{ 
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(0.7rem, 1.2vw, 0.85rem)",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--blue)",
              display: "flex",
              gap: "8px"
            }}>
              <span className="word" style={{ 
                opacity: 0, transform: "translateY(20px)", 
                transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "100ms"
              }}>{article.category}</span>
              <span className="word" style={{ 
                opacity: 0, transform: "translateY(20px)", 
                transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "180ms"
              }}>Comparativo</span>
              <span className="word" style={{ 
                opacity: 0, transform: "translateY(20px)", 
                transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "260ms"
              }}>2026</span>
            </div>

            <h1 className="reveal-word" style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3rem, 7vw, 6rem)",
              fontWeight: 200,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              color: "var(--ink)",
              marginBottom: "24px",
              marginTop: "-8px"
            }}>
              <span className="word" style={{ 
                opacity: 0, transform: "translateY(30px)", 
                transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "200ms",
                display: "block"
              }}>{article.title.split(' ').slice(0, Math.ceil(article.title.split(' ').length / 2)).join(' ')}</span>
              <span className="word" style={{ 
                opacity: 0, transform: "translateY(30px)", 
                transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                transitionDelay: "280ms",
                display: "block"
              }}>{article.title.split(' ').slice(Math.ceil(article.title.split(' ').length / 2)).join(' ')}</span>
            </h1>

            <p className="reveal-word" style={{
              fontSize: "clamp(1.05rem, 1.5vw, 1.2rem)",
              color: "var(--body)",
              maxWidth: 720,
              margin: "32px 0 48px",
              lineHeight: 1.9,
              fontWeight: 300,
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "500ms"
            }}>
              {article.description}
            </p>

            {/* Quick action CTA */}
            <div className="reveal-word flex flex-wrap gap-4" style={{
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "580ms"
            }}>
              {article.products && article.products[0]?.product_url && (
                <a 
                  href={article.products[0].product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-cta magnetic"
                  data-magnetic="true"
                  style={{
                    background: "var(--cta)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "16px 36px",
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
                  Ver Melhor Preço no ML
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
              )}
              <a 
                href="#scores" 
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
                Ver Pontuações →
              </a>
            </div>
          </div>

          {/* Hero image with parallax */}
          {article.hero?.imageUrl && (
            <div 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80vw] max-w-[800px] h-[40vh] pointer-events-none"
              style={{ 
                zIndex: -1,
                opacity: 0.15,
                transformOrigin: "center bottom",
              }}
            >
              <SafeImage
                src={article.hero.imageUrl}
                alt={article.title}
                fill
                sizes="80vw"
                className="object-cover"
                style={{ 
                  borderRadius: "16px 16px 0 0",
                  filter: "grayscale(20%)",
                  objectPosition: "center 40%",
                }}
              />
            </div>
          )}

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bounce-slow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </div>
        </section>

        {/* Pinned Scores Section - Scroll Narrative */}
        <section id="scores" className="relative" style={{ 
          background: "var(--ink)", 
          color: "#fff",
          padding: "80px 32px",
          minHeight: "100vh",
        }}>
          <div className="max-w-7xl mx-auto">
            <div className="relative" style={{ minHeight: "100vh" }}>
              {/* Left: Sticky Scores Panel */}
              <div className="sticky top-20 max-w-lg" style={{ 
                maxHeight: "calc(100vh - 120px)",
                overflowY: "auto",
                paddingRight: "32px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div className="reveal mb-12" style={{ transitionDelay: "100ms" }}>
                  <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Pontuação</span>
                  <h2 className="sec-h" style={{ color: "#fff", marginTop: "8px" }}>COMO ELES SE SAÍRAM</h2>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontWeight: 300, fontSize: "0.95rem", lineHeight: 1.7 }}>
                    Testamos cada critério que importa. Veja quem entrega o melhor custo-benefício real.
                  </p>
                </div>

                {article.hero?.bars && article.hero.bars.length > 0 && (
                  <div className="space-y-8">
                    {article.hero.bars.map((bar, i) => {
                      const numericScore = parseFloat(bar.value);
                      const winner = numericScore === Math.max(...article.hero!.bars.map(b => parseFloat(b.value)));
                      return (
                        <div 
                          key={bar.label}
                          className="reveal relative group"
                          style={{ 
                            transitionDelay: `${200 + i * 100}ms`,
                            padding: "20px",
                            background: winner ? "rgba(149,100,0,0.08)" : "rgba(255,255,255,0.02)",
                            border: winner ? "1px solid rgba(149,100,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                            borderRadius: "12px",
                            transition: "all 0.3s",
                          }}
                          data-hover={JSON.stringify({
                            "border-color": "rgba(31,108,159,0.3)",
                            ...(winner ? {} : { background: "rgba(255,255,255,0.05)" }),
                          })}
                          data-hover-base={JSON.stringify({
                            background: winner ? "rgba(149,100,0,0.08)" : "rgba(255,255,255,0.02)",
                            "border-color": winner ? "rgba(149,100,0,0.3)" : "rgba(255,255,255,0.06)",
                          })}
                        >
                          {winner && (
                            <span className="absolute -top-3 left-6 px-3 py-1 text-xs font-heading font-bold tracking-wider uppercase" style={{ 
                              background: "var(--amber)", 
                              color: "#111",
                              borderRadius: "4px",
                            }}>
                              VENCEDOR
                            </span>
                          )}
                          <div className="flex items-center justify-between mb-4">
                            <span className="font-heading font-bold text-lg text-white">{bar.label}</span>
                            <span className="font-display text-3xl" style={{ color: "var(--amber)" }}>{bar.value}</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: "0%",
                                background: `linear-gradient(90deg, ${numericScore >= 8 ? "#F59E0B" : numericScore >= 6 ? "#3B82F6" : "#F59E0B"}, ${numericScore >= 8 ? "#FCD34D" : numericScore >= 6 ? "#60A5FA" : "#FBBF24"})`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Scrolling Product Gallery - Horizontal narrative */}
              <div className="absolute top-0 right-0 w-[calc(100%-320px)] h-full pr-8" style={{ 
                minWidth: 0,
                paddingTop: "120px",
              }}>
                <div className="relative h-[calc(100vh-200px)]">
                  {/* Product cards that animate on scroll */}
                  {article.products && article.products.length > 0 && (
                    <div className="flex gap-6 h-full overflow-x-auto scroll-smooth snap-x pb-8" 
                      style={{ 
                        scrollSnapType: "x mandatory",
                        scrollPadding: "0 32px",
                        margin: "0 -8px",
                        padding: "0 8px 32px",
                        scrollbarWidth: "thin",
                        scrollbarColor: "rgba(255,255,255,0.1) transparent",
                      }}
                    >
                      {article.products.map((product, pi) => (
                        <div 
                          key={product.slug || product.name}
                          className="reveal flex-shrink-0 snap-start relative magnetic"
                          data-magnetic="true"
                          style={{
                            transitionDelay: `${200 + pi * 120}ms`,
                            width: "320px",
                            maxWidth: "calc(100% - 64px)",
                            scrollSnapAlign: "start",
                            flexShrink: 0,
                            willChange: "transform, box-shadow",
                          }}
                          data-hover={JSON.stringify({
                            "box-shadow": "0 20px 60px rgba(0,0,0,0.3)",
                            transform: "translateY(-8px)",
                          })}
                          data-hover-base={JSON.stringify({
                            "box-shadow": "none",
                            transform: "translateY(0)",
                          })}
                        >
                          {product.imageUrl && (
                            <div className="relative h-64 mb-4 overflow-hidden rounded-xl">
                              <SafeImage
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                sizes="320px"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                            </div>
                          )}
                          <div className="p-4">
                            <h3 className="font-heading font-bold text-white text-base mb-2 leading-snug group-hover:text-amber-400 transition-colors">
                              {product.name}
                            </h3>
                            {product.product_url && (
                              <a 
                                href={product.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-heading font-bold text-amber-400 hover:text-amber-300 transition-colors"
                              >
                                Ver no ML
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content narrative that scrolls alongside */}
                  {article.content && (
                    <div className="prose mt-12 max-w-2xl" style={{ color: "rgba(255,255,255,0.8)" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Article Content Section */}
        <section className="relative py-24" style={{ background: "var(--bg)" }}>
          <div className="max-w-4xl mx-auto px-8">
            {article.content && (
              <div className="article-body reveal" style={{ transitionDelay: "200ms" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
            )}

            {/* Products Grid - Bento style */}
            {article.products && article.products.length > 0 && (
              <div className="mt-20 reveal" style={{ transitionDelay: "300ms" }}>
                <h2 className="font-heading font-extrabold text-lg text-[var(--ink)] tracking-wider uppercase mb-8">
                  Produtos Comparados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {article.products.map((product, pi) => (
                    <a
                      key={product.slug || product.name}
                      href={product.product_url || `/reviews/${product.slug}`}
                      target={product.product_url ? "_blank" : undefined}
                      rel={product.product_url ? "noopener noreferrer" : undefined}
                      className="group relative block overflow-hidden magnetic"
                      data-magnetic="true"
                      style={{
                        background: "var(--bg)",
                        border: "1.5px solid var(--border)",
                        borderRadius: "14px",
                        padding: "24px",
                        textDecoration: "none",
                        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                        willChange: "transform, box-shadow, border-color",
                      }}
                      data-hover={JSON.stringify({
                        "border-color": "var(--blue)",
                        "box-shadow": "0 12px 40px rgba(0,0,0,0.08)",
                        transform: "translateY(-6px) scale(1.01)",
                      })}
                      data-hover-base={JSON.stringify({
                        "border-color": "var(--border)",
                        "box-shadow": "none",
                        transform: "translateY(0)",
                      })}
                    >
                      {product.imageUrl && (
                        <div className="relative h-40 mb-4 overflow-hidden rounded-lg">
                          <SafeImage
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 160px"
                            className="object-contain transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <h3 className="font-heading font-bold text-[var(--ink)] text-sm leading-snug mb-2 group-hover:text-[var(--blue)] transition-colors">
                        {product.name}
                      </h3>
                      {product.product_url && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[var(--blue)]">
                          Ver no ML
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                          </svg>
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <AuthorBox
              name="Vetor Blog"
              bio="Reviews e comparativos independentes de tecnologia."
              date={article.published_at || article.created_at || new Date().toISOString()}
              readTime="5 min de leitura"
            />
          </div>
        </section>

        {/* Related Articles */}
        {relatedFiltered.length > 0 && (
          <section className="relative py-24" style={{ background: "var(--surface)", borderTop: "1.5px solid var(--border)" }}>
            <div className="max-w-4xl mx-auto px-8">
              <div className="reveal text-center mb-16" style={{ transitionDelay: "100ms" }}>
                <p className="font-heading text-sm font-bold text-[var(--amber)] mb-2 tracking-wider uppercase">
                  Continue lendo
                </p>
                <h2 className="sec-h">OUTROS COMPARATIVOS</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {relatedFiltered.map((r, i) => (
                  <a
                    key={r.slug}
                    href={`/comparativos/${r.slug}`}
                    className="reveal group relative block overflow-hidden magnetic"
                    data-magnetic="true"
                    style={{ 
                      transitionDelay: `${200 + i * 100}ms`,
                      background: "var(--bg)",
                      border: "1.5px solid var(--border)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      textDecoration: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                      willChange: "transform, box-shadow, border-color",
                    }}
                    data-hover={JSON.stringify({
                      "border-color": "var(--blue)",
                      "box-shadow": "0 16px 48px rgba(0,0,0,0.1)",
                      transform: "translateY(-6px)",
                    })}
                    data-hover-base={JSON.stringify({
                      "border-color": "var(--border)",
                      "box-shadow": "none",
                      transform: "translateY(0)",
                    })}
                  >
                    {r.hero?.imageUrl && (
                      <div className="relative h-48 overflow-hidden">
                        <SafeImage src={r.hero.imageUrl} alt={r.title} fill sizes="(max-width: 640px) 100vw, 340px" className="object-cover transition-transform duration-600 group-hover:scale-105" />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="font-heading font-bold text-[var(--ink)] text-base leading-snug mb-3 group-hover:text-[var(--blue)] transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-[var(--muted)] font-light text-sm line-clamp-3">{r.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Final CTA */}
        <section className="relative py-24 overflow-hidden" style={{ background: "var(--ink)" }}>
          <div className="absolute inset-0 -z-10" style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% 50%, rgba(31,108,159,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 20% 80%, rgba(149,100,0,0.08) 0%, transparent 60%)
            `
          }} />
          <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
            <div className="reveal" style={{ transitionDelay: "100ms" }}>
              <h2 className="sec-h" style={{ color: "#fff", marginBottom: "16px" }}>AINDA EM DÚVIDA?</h2>
              <p style={{ color: "rgba(255,255,255,0.7)", fontWeight: 300, marginBottom: "40px", fontSize: "1.1rem", lineHeight: 1.8, maxWidth: 600, margin: "16px auto 40px" }}>
                Veja todos os nossos comparativos custo-benefício 2026 e encontre o produto ideal para seu bolso.
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
                Ver Todos os Comparativos →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      
      {/* Entrance Animations */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              if (prefersReduced) {
                document.querySelectorAll('.reveal, .reveal-word').forEach(el => {
                  el.classList.add('in');
                  el.style.opacity = '1';
                  el.style.transform = 'none';
                });
                return;
              }
              
              // Staggered word reveal
              document.querySelectorAll('.reveal-word .word').forEach((el, i) => {
                setTimeout(() => {
                  el.style.opacity = '1';
                  el.style.transform = 'none';
                }, 100 + i * 80);
              });
              
              // IntersectionObserver for scroll reveals
              const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('in');
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'none';
                    observer.unobserve(entry.target);
                  }
                });
              }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
              
              document.querySelectorAll('.reveal:not(.in), .reveal-word:not(.word)').forEach(el => {
                observer.observe(el);
              });
              
              // Stagger children
              document.querySelectorAll('.reveal > *').forEach((el, i) => {
                el.style.transitionDelay = (i * 80) + 'ms';
              });
            })();
          `
        }}
      />
    </>
  );
}