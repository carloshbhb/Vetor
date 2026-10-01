import SafeImage from "@/components/SafeImage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgressBar from "@/components/ProgressBar";
import ScoreBars from "@/components/ScoreBars";
import ProsCons from "@/components/ProsCons";
import SpecTable from "@/components/SpecTable";
import Reveal from "@/components/Reveal";
import ReviewContent from "@/components/ReviewContent";
import { ReviewSchema, FAQSchema, BreadcrumbSchema } from "@/components/SchemaMarkup";
import { fetchReviewBySlug, fetchAllReviews } from "@/lib/data";
import type { Review } from "@/lib/types";
import StickyReviewNav from "@/components/StickyReviewNav";
import AuthorBox from "@/components/AuthorBox";
import { primaryAuthor } from "@/data/authors";
import NoiseOverlay from "@/components/NoiseOverlay";
import CustomCursor from "@/components/CustomCursor";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const reviews = await fetchAllReviews();
  return reviews.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await fetchReviewBySlug(slug);
  if (!review) return { title: "Review não encontrado" };
  const url = `https://www.vetor.blog/reviews/${review.slug}`;
  const title = review.meta_title || `Review: ${review.product}`;
  const description =
    review.meta_description ||
    review.hero_lead ||
    `Review independente do ${review.product}: nota, prós, contras e onde comprar.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: review.image_url ? [review.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function generateVerdictText(review: Review): string {
  const score = review.verdict_score;
  const product = review.product;
  if (score >= 9) return `${product} é uma excelente escolha. Recomendamos fortemente.`;
  if (score >= 7) return `${product} é uma boa opção. Vale a pena considerar.`;
  if (score >= 5) return `${product} é razoável. Existem alternativas melhores.`;
  return `${product} não se destaca. Recomendamos buscar alternativas.`;
}

export default async function ReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const review = await fetchReviewBySlug(slug);
  if (!review) notFound();

  const score = review.verdict_score || review.hero_overall_score;
  const verdictLabel = review.verdict_label || (score >= 8 ? "Fortemente Recomendado" : score >= 5 ? "Recomendado" : "Não Recomendado");
  const verdictText = review.verdict_text || generateVerdictText(review);
  const totalContentLength = review.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 500;
  const readTime = `${Math.max(3, Math.ceil(totalContentLength / 1000))} min de leitura`;

  const allReviews = await fetchAllReviews();
  const related = allReviews
    .filter((r) => r.category === review.category && r.slug !== review.slug)
    .slice(0, 3);

  const starCount = Math.round(score / 2);
  const quickFacts = review.specs?.slice(0, 5) || [];
  const topSpecs = review.specs?.slice(0, 10) || [];
  const heroBars = Array.isArray(review.hero_bars) ? review.hero_bars : [];
  const sections = Array.isArray(review.sections) ? review.sections : [];
  const testimonials = Array.isArray(review.testimonials) ? review.testimonials : [];
  const faq = Array.isArray(review.faq) ? review.faq : [];

  const sectionNav = [
    { id: "topo", label: "Início" },
    ...(heroBars.length > 0 ? [{ id: "avaliacao", label: "Avaliação" }] : []),
    ...(sections.length > 0 ? [{ id: "analise", label: "Análise" }] : []),
    ...(topSpecs.length ? [{ id: "ficha-tecnica", label: "Ficha Técnica" }] : []),
    ...(testimonials.length > 0 ? [{ id: "compradores", label: "Compradores" }] : []),
    ...(review.compare_table?.rows?.length ? [{ id: "comparativo", label: "Comparativo" }] : []),
    { id: "veredicto", label: "Veredicto" },
    ...(review.affiliate_url ? [{ id: "comprar", label: "Comprar" }] : []),
    ...(faq.length > 0 ? [{ id: "faq", label: "FAQ" }] : []),
  ];

  const verdictBgs = score >= 8
    ? { badge: "rgba(16,185,129,0.15)", badgeBorder: "rgba(16,185,129,0.4)", badgeText: "#6EE7B7" }
    : score >= 5
    ? { badge: "rgba(217,119,6,0.15)", badgeBorder: "rgba(217,119,6,0.4)", badgeText: "#FCD34D" }
    : { badge: "rgba(220,38,38,0.15)", badgeBorder: "rgba(220,38,38,0.4)", badgeText: "#FCA5A5" };

  return (
    <>
      <ProgressBar />
      <ReviewSchema review={review} />
      {faq.length > 0 && <FAQSchema faqs={faq} />}
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.vetor.blog/" },
          { name: "Reviews", url: "https://www.vetor.blog/reviews" },
          { name: review.product, url: `https://www.vetor.blog/reviews/${review.slug}` },
        ]}
      />

      {/* Premium UI: Noise overlay + Custom cursor */}
      <NoiseOverlay opacity={0.02} />
      <CustomCursor />

      {/* ============================================================
           IN-PAGE STICKY NAV (replaces site Navbar on review pages)
      ============================================================ */}
      <StickyReviewNav
        sections={sectionNav}
        score={score}
        affiliateUrl={review.affiliate_url}
        product={review.product}
      />

      {/* ============================================================
           HERO - Full bleed with word-level animation
      ============================================================ */}
      <section className="hero" id="topo" style={{ 
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient radial gradients */}
        <div className="pointer-events-none absolute inset-0 -z-10" style={{
          background: `
            radial-gradient(ellipse 70% 50% at 20% 10%, rgba(31,108,159,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 90%, rgba(149,100,0,0.04) 0%, transparent 50%)
          `
        }} />

        <div className="hero-left container" style={{ padding: "64px 32px 0", position: "relative", zIndex: 10 }}>
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              { label: "Reviews", href: "/reviews" },
              { label: review.product },
            ]}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 20, margin: "16px 0" }}>
            {review.image_url && (
              <SafeImage
                src={review.image_url}
                alt={review.product}
                width={80}
                height={80}
                style={{ borderRadius: 10, objectFit: "cover", border: "1.5px solid var(--border)", transition: "transform 0.3s" }}
                sizes="80px"
                priority
              />
            )}
            <div>
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 font-heading font-extrabold text-[0.7rem] tracking-[0.04em]" style={{ background: "#DCFCE7", color: "#15803D", border: "1.5px solid #BBF7D0", borderRadius: 4 }}>
                ✓ &nbsp;Review · {review.category}
              </div>
              <h1 className="font-display reveal-word" style={{ 
                fontSize: "clamp(2.4rem, 5vw, 4rem)", 
                lineHeight: 0.95, 
                letterSpacing: "0.01em", 
                color: "var(--ink)",
                marginBottom: "16px",
              }}>
                <span className="word" style={{ 
                  opacity: 0, transform: "translateY(30px)", 
                  transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "200ms",
                  display: "block"
                }}>
                  {review.hero_headline_line1 ? `${review.hero_headline_line1}<br />` : ""}
                </span>
                <span className="word" style={{ 
                  opacity: 0, transform: "translateY(30px)", 
                  transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: "280ms",
                  display: "block"
                }}>
                  {review.hero_headline_line2 || review.product}
                </span>
                {review.hero_headline_em && (
                  <span className="word text-blue" style={{ 
                    opacity: 0, transform: "translateY(30px)", 
                    transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                    transitionDelay: "360ms",
                    display: "block"
                  }}>
                    {review.hero_headline_em}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <p className="reveal-word text-[1.05rem] text-body leading-[1.8] max-w-[520px] mb-7 font-light" style={{
            opacity: 0,
            transform: "translateY(20px)",
            transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: "500ms"
          }}>
            {review.hero_lead}
          </p>

          {score > 0 && (
            <div className="reveal-word flex items-center gap-1 mb-6" style={{
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "580ms"
            }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="star" style={{ color: star <= starCount ? "var(--amber)" : "#D1D5DB", fontSize: "1.2rem" }}>
                  ★
                </span>
              ))}
              <span className="font-heading text-[0.78rem] font-bold text-body ml-1.5">{(score / 2).toFixed(1)} / 5 — {score >= 8 ? "Excelente" : score >= 6 ? "Bom" : "Razoável"}</span>
            </div>
          )}

          {quickFacts.length > 0 && (
            <div className="reveal-word flex flex-wrap overflow-hidden rounded-lg mb-8" style={{
              border: "1.5px solid var(--border2)", background: "var(--bg)",
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
              transitionDelay: "660ms"
            }}>
              {quickFacts.map((spec, i) => (
                <div key={i} className="qf-item flex-1 min-w-[100px] text-center" style={{ padding: "14px 16px", borderRight: i < quickFacts.length - 1 ? "1.5px solid var(--border)" : "none" }}>
                  <span className="font-display text-blue block" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", lineHeight: 1 }}>{spec.value}</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "'Syne',sans-serif", fontWeight: 700, letterSpacing: "0.04em" }}>{spec.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Magnetic CTA Buttons */}
          <div className="reveal-word flex items-center gap-4 flex-wrap" style={{
            opacity: 0,
            transform: "translateY(20px)",
            transition: "opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            transitionDelay: "740ms"
          }}>
            {review.affiliate_url && (
              <a
                href={review.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
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
                  transition: "background 0.15s, transform 0.2s, box-shadow 0.2s",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  willChange: "transform",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
                }}
                data-hover={JSON.stringify({
                  background: "var(--cta-dk)",
                  "box-shadow": "0 8px 32px rgba(0,0,0,0.2)",
                  transform: "scale(1.02)",
                })}
                data-hover-base={JSON.stringify({
                  background: "var(--cta)",
                  "box-shadow": "0 4px 24px rgba(0,0,0,0.15)",
                  transform: "scale(1)",
                })}
                data-hover-down={JSON.stringify({ transform: "scale(0.98)" })}
                data-hover-up={JSON.stringify({ transform: "scale(1.02)" })}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                Ver Preço Atualizado no ML
              </a>
            )}
            <a href="#ficha-tecnica" className="btn-sec magnetic" data-magnetic="true" style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "var(--blue)",
              textDecoration: "none",
              borderBottom: "2px solid var(--blue)",
              paddingBottom: "4px",
              transition: "color 0.15s, border-color 0.15s",
              willChange: "transform",
            }}>
              Ver ficha técnica ↓
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================
           QUEM DEVE LER (Who Band)
      ============================================================ */}
      {(review.pros.length > 0 || review.cons.length > 0) && (
        <div className="who-band">
          <div className="who-inner">
            {review.pros.length > 0 && (
              <div className="who-col">
                <div className="who-col-title">PARA QUEM É IDEAL</div>
                <h2 className="who-col-heading">Compre se você busca…</h2>
                <ul className="who-list yes">
                  {review.pros.slice(0, 6).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
            {review.cons.length > 0 && (
              <div className="who-col">
                <div className="who-col-title">PARA QUEM NÃO É</div>
                <h2 className="who-col-heading">Pule se você precisa de…</h2>
                <ul className="who-list no">
                  {review.cons.slice(0, 6).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
           SCORE BREAKDOWN (Dark Band)
      ============================================================ */}
      {heroBars.length > 0 && (
        <section className="scores-band" id="avaliacao">
          <div className="scores-inner">
            <div className="scores-head">
              <div className="scores-head-text">
                <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Pontuação detalhada</span>
                <h2 className="sec-h" style={{ color: "#fff", marginBottom: 6 }}>Como avaliamos cada critério</h2>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem", fontWeight: 300 }}>Cada critério foi avaliado com base em uso real, comparando com concorrentes na mesma faixa de preço.</p>
              </div>
              <div className="big-score">
                <span className="big-score-num">{score.toFixed(1)}</span>
                <span className="big-score-label">NOTA FINAL / 10</span>
              </div>
            </div>
            <ScoreBars bars={heroBars.map((b) => ({ label: b.label, score: b.value }))} />
          </div>
        </section>
      )}

      {/* ============================================================
           LONG-FORM ANALYSIS (sections)
      ============================================================ */}
      {sections.length > 0 && (
        <div className="content" id="analise">
          <div className="container" style={{ paddingTop: 72, paddingBottom: 72 }}>
            <article className="max-w-[680px]" style={{ textAlign: "left" }}>
              <span className="sec-label">Análise completa</span>
              <h2 className="sec-h mb-4">Nossa análise</h2>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 300, marginBottom: 24 }}>
                {review.created_at && <>Publicado em {formatDate(review.created_at)}</>}
                {review.created_at && review.updated_at && " · "}
                {review.updated_at && <>Atualizado em {formatDate(review.updated_at)}</>}
                {totalContentLength > 0 && <> · {readTime}</>}
              </p>
              <ReviewContent sections={sections} />
            </article>
          </div>
        </div>
      )}

      {/* ============================================================
           FICHA TÉCNICA
      ============================================================ */}
      {topSpecs.length > 0 && (
      <div className="content" id="ficha-tecnica">
        <div className="container" style={{ paddingTop: 72, paddingBottom: 72 }}>
            <article className="max-w-[680px]" style={{ textAlign: "left" }}>
              <h2 className="sec-h mb-4">Ficha Técnica</h2>
              <SpecTable specs={topSpecs} />
            </article>
          </div>
        </div>
      )}

      {/* ============================================================
           PROS / CONS (full-width section)
      ============================================================ */}
      {(review.pros.length > 0 || review.cons.length > 0) && (
        <section className="proscons-sec">
          <div className="proscons-inner">
            <span className="sec-label">Análise imparcial</span>
            <h2 className="sec-h">Prós e Contras — sem filtro</h2>
            <ProsCons pros={review.pros} cons={review.cons} />
          </div>
        </section>
      )}

      {/* ============================================================
           TESTIMONIALS
      ============================================================ */}
      {testimonials.length > 0 && (
        <section className="testi-sec">
          <div className="testi-inner">
            <span className="sec-label">Compradores verificados</span>
            <h2 className="sec-h">O que quem comprou está dizendo</h2>
            <div className="testi-grid">
              {testimonials.map((t, i) => (
                <div key={i} className="testi-item">
                  <div className="testi-avatar-placeholder">{(t.name || "A")[0]}</div>
                  <div className="testi-content">
                    <div className="testi-stars">{"★".repeat(t.stars || 5)}</div>
                    <p className="testi-quote">{t.quote}</p>
                    <div className="testi-author">{t.name}</div>
                    <div className="testi-role">{t.role}</div>
                  </div>
                  {t.platform && <span className="testi-platform">{t.platform}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
           COMPARISON TABLE (full-width section)
      ============================================================ */}
      {(() => {
        const ct = review.compare_table;
        const ctRows = Array.isArray(ct?.rows) ? ct.rows : [];
        const ctCols = Array.isArray(ct?.columns) ? ct.columns : [];
        if (ctRows.length === 0) return null;
        return (
          <section className="compare-sec" id="comparativo">
            <div className="compare-inner">
              <span className="sec-label">Análise de mercado</span>
              <h2 className="sec-h">Comparativo</h2>
              <table className="compare-table">
                <thead>
                  <tr>
                    {ctCols.map((col, i) => (
                      <th key={i} className={i === (ct?.winnerCol ?? 0) ? "hl" : ""}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ctRows.map((row, ri) => {
                    const rowValues = Array.isArray(row?.values) ? row.values : [];
                    return (
                      <tr key={ri}>
                        <td>{row.feature}</td>
                        {rowValues.map((val, vi) => (
                          <td key={vi} className={vi === (ct?.winnerCol ?? 0) ? "hl" : ""}>
                            {val}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })()}

      {/* ============================================================
           VERDICT (Dark Section)
      ============================================================ */}
      <section className="verdict-sec" id="veredicto">
        <div className="verdict-inner">
          <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Análise final</span>
          <h2 className="sec-h" style={{ color: "#fff", fontSize: "clamp(2rem,4vw,3.4rem)", marginBottom: 0 }}>Veredicto</h2>
          <div className="verdict-grid">
            <div className="verdict-score-block">
              <span className="verdict-score-big">{score.toFixed(1)}</span>
              <div className="verdict-badge">✓ {verdictLabel}</div>
            </div>
            <div className="verdict-content">
              <div className="verdict-mini-scores">
                {heroBars.slice(0, 3).map((bar, i) => (
                  <div key={i} className="vms-item">
                    <div className="vms-label">{bar.label}</div>
                    <div className="vms-val">{bar.value.toFixed(1)}</div>
                  </div>
                ))}
              </div>
              <p className="verdict-text">{verdictText}</p>
              {review.verdict_note && (
                <p className="verdict-text">{review.verdict_note}</p>
              )}
              {review.affiliate_url && (
                <a
                  href={review.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="btn-cta"
                  style={{ alignSelf: "flex-start", marginTop: 4 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Ver preço e comprar
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

{/* ============================================================
            BUY CTA - Glassmorphism with Magnetic CTA
       ============================================================ */}
      {review.affiliate_url && (
        <section className="buy-sec" id="comprar" style={{ position: "relative", overflow: "hidden" }}>
          {/* Glassmorphism background layers */}
          <div className="pointer-events-none absolute inset-0 -z-10" style={{
            background: `
              radial-gradient(ellipse 50% 30% at 50% 50%, rgba(31,108,159,0.08) 0%, transparent 60%),
              radial-gradient(ellipse 40% 25% at 80% 20%, rgba(149,100,0,0.06) 0%, transparent 50%),
              radial-gradient(ellipse 30% 20% at 20% 80%, rgba(52,101,56,0.04) 0%, transparent 40%)
            `
          }} />
          
          {/* Glassmorphism card overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 -z-5" style={{
            background: "linear-gradient(to top, rgba(17,17,17,0.03) 0%, transparent 100%)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }} />

          <div className="buy-inner relative z-10">
            <div className="reveal text-center mb-12" style={{ transitionDelay: "100ms" }}>
              <span className="sec-label">Oferta verificada</span>
              <h2 className="sec-h">Onde comprar pelo melhor preço</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "0.95rem", maxWidth: 600, margin: "16px auto 0" }}>
                Encontramos a melhor oferta disponível neste momento. Preço pode variar.
              </p>
            </div>

            {/* Glassmorphism buy card */}
            <div className="buy-card relative magnetic" data-magnetic="true" style={{
              willChange: "transform, box-shadow, border-color",
              transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s, background 0.2s",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
            data-hover={JSON.stringify({
              "border-color": "var(--blue)",
              "box-shadow": "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(31,108,159,0.2)",
              transform: "translateY(-4px)",
              background: "rgba(255,255,255,0.85)",
            })}
            data-hover-base={JSON.stringify({
              "border-color": "var(--border)",
              "box-shadow": "0 8px 32px rgba(0,0,0,0.08)",
              transform: "translateY(0)",
              background: "rgba(255,255,255,0.7)",
            })}
            data-hover-down={JSON.stringify({ transform: "translateY(-2px) scale(0.995)" })}
            data-hover-up={JSON.stringify({ transform: "translateY(-4px)" })}
            >
              <div className="buy-card-head" style={{
                background: "linear-gradient(135deg, var(--cta) 0%, var(--cta-dk) 100%)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}>
                <span className="buy-card-head-title">🏅 Melhor Oferta Disponível — {review.marketplace || "Mercado Livre"}</span>
                <span className="buy-card-head-badge" style={{ 
                  background: "rgba(255,255,255,0.2)", 
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.3)",
                }}>OFERTA VERIFICADA</span>
              </div>
              <div className="buy-card-body">
                <div>
                  <div className="buy-product-name">{review.product}</div>
                  <ul className="buy-features">
                    {topSpecs.slice(0, 6).map((spec, i) => (
                      <li key={i} style={{ 
                        position: "relative",
                        paddingLeft: "28px",
                        fontSize: "0.88rem",
                        color: "var(--body)",
                        fontWeight: 300,
                        marginBottom: "10px",
                      }}>
                        <span style={{ 
                          position: "absolute", 
                          left: 0, 
                          top: "2px",
                          color: "var(--green)", 
                          fontWeight: 700,
                          fontSize: "1rem",
                        }}>✓</span>
                        <strong style={{ color: "var(--ink)", fontWeight: 600 }}>{spec.label}:</strong> {spec.value}
                      </li>
                    ))}
                  </ul>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 300, display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>✓ Venda verificada</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>✓ Garantia inclusa</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>✓ Entrega rápida</span>
                  </div>
                </div>
                <div className="buy-price-block">
                  {review.price_old && (
                    <div className="buy-old-price" style={{ textDecoration: "line-through", color: "var(--muted)" }}>De {review.price_old}</div>
                  )}
                  <div className="buy-main-price" style={{ 
                    fontFamily: "var(--font-display)", 
                    fontSize: "clamp(2.5rem, 4vw, 3.5rem)", 
                    color: "var(--cta)", 
                    lineHeight: 1,
                    fontWeight: 300,
                    letterSpacing: "-0.02em",
                  }}>
                    {review.price_new || "Consultar"}
                  </div>
                  <div className="buy-period" style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 300, marginTop: "8px" }}>no Pix · ou parcele</div>
                  <a
                    href={review.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="btn-buy magnetic"
                    data-magnetic="true"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "linear-gradient(135deg, var(--amber) 0%, #B8860B 100%)",
                      color: "#111",
                      border: "none",
                      borderRadius: "8px",
                      padding: "18px 40px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                      fontSize: "1rem",
                      letterSpacing: "0.02em",
                      textDecoration: "none",
                      transition: "background 0.15s, transform 0.2s, box-shadow 0.2s",
                      willChange: "transform, box-shadow",
                      boxShadow: "0 4px 24px rgba(149,100,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
                      marginTop: "16px",
                    }}
                    data-hover={JSON.stringify({
                      background: "linear-gradient(135deg, #B8860B 0%, #956400 100%)",
                      "box-shadow": "0 8px 32px rgba(149,100,0,0.4), 0 0 0 1px rgba(255,255,255,0.2)",
                      transform: "translateY(-2px)",
                    })}
                    data-hover-base={JSON.stringify({
                      background: "linear-gradient(135deg, var(--amber) 0%, #B8860B 100%)",
                      "box-shadow": "0 4px 24px rgba(149,100,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
                      transform: "translateY(0)",
                    })}
                    data-hover-down={JSON.stringify({ transform: "translateY(0) scale(0.98)" })}
                    data-hover-up={JSON.stringify({ transform: "translateY(-2px)" })}
                  >
                    Comprar Agora no ML
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </a>
                  <div className="buy-note" style={{ fontSize: "0.7rem", color: "var(--muted)", textAlign: "center", marginTop: "12px", fontWeight: 300 }}>Você será direcionado ao {review.marketplace || "Mercado Livre"}</div>
                </div>
              </div>
              
              {/* Glassmorphism guarantee band */}
              <div className="guarantee-band relative" style={{
                background: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                marginTop: "24px",
              }}>
                <div className="guarantee-seal" style={{ 
                  width: "56px", height: "56px", 
                  background: "rgba(16,185,129,0.1)", 
                  border: "2px solid rgba(16,185,129,0.3)",
                  backdropFilter: "blur(8px)",
                }}>🛡️</div>
                <div className="guarantee-text">
                  <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "0.85rem", color: "var(--ink)", marginBottom: "3px" }}>Compra 100% protegida</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--body)", fontWeight: 300, lineHeight: 1.6 }}>Garantia de devolução e produto original. Você conta com suporte completo.</p>
                </div>
              </div>
            </div>

            {/* Trust signals with glassmorphism */}
            <div className="trust-row mt-8" style={{ 
              background: "rgba(255,255,255,0.4)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "20px 24px",
            }}>
              {["🔒 Pagamento seguro", "🚚 Frete grátis", "🏭 Produto original", "📋 Nota fiscal", "↩️ Devolução em 7 dias"].map((item) => (
                <div key={item} className="trust-item" style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "8px",
                  fontFamily: "var(--font-heading)", 
                  fontSize: "0.7rem", 
                  fontWeight: 700, 
                  color: "var(--muted)",
                  padding: "0 8px",
                  borderRight: "1px solid var(--border)",
                }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
           FAQ (surface background)
      ============================================================ */}
      {faq.length > 0 && (
        <section className="faq-sec" id="faq">
          <div className="faq-inner">
            <span className="sec-label">Dúvidas frequentes</span>
            <h2 className="sec-h">Perguntas que todo mundo faz</h2>
            <div className="faq-list">
              {faq.map((item, i) => (
                <FaqItem key={i} question={item.question} answer={item.answer} isFirst={i === 0} isLast={i === faq.length - 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================
           AUTHOR (E-E-A-T)
      ============================================================ */}
      <div className="content">
        <div className="container" style={{ paddingTop: 72, paddingBottom: 72 }}>
          <div style={{ maxWidth: 680 }}>
            <AuthorBox
              name={primaryAuthor.name}
              role={primaryAuthor.role}
              bio={primaryAuthor.tagline}
              slug={primaryAuthor.slug}
              date={review.created_at}
              readTime={readTime}
            />
          </div>
        </div>
      </div>

      {/* ============================================================
           RELATED REVIEWS
      ============================================================ */}
      {related.length > 0 && (
        <Reveal>
          <section style={{ padding: "72px 32px", background: "var(--surface)" }}>
            <div className="container">
              <span className="sec-label">Continue lendo</span>
              <h2 className="sec-h">Outros Reviews</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-9">
                {related.map((r) => {
                  const rScore = r.verdict_score || r.hero_overall_score;
                  const rVerdict = rScore >= 8 ? "✓ Recomendado" : rScore >= 5 ? "Razoável" : "Não Recomendado";
                  const rColor = rScore >= 8 ? "var(--green)" : rScore >= 5 ? "var(--amber)" : "var(--red)";
                  return (
                    <a
                      key={r.slug}
                      href={`/reviews/${r.slug}`}
                      style={{ display: "block", background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden", transition: "all 0.3s", textDecoration: "none" }}
                    >
                      {r.image_url && (
                        <div style={{ position: "relative", height: 180, overflow: "hidden" }}>
                          <SafeImage src={r.image_url} alt={r.product} fill style={{ objectFit: "cover" }} sizes="(max-width: 640px) 100vw, 340px" />
                        </div>
                      )}
                      <div style={{ padding: 20 }}>
                        <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.95rem", color: "var(--ink)", marginBottom: 6, lineHeight: 1.3 }}>
                          {r.product}
                        </h3>
                        <p style={{ fontSize: "0.82rem", color: "var(--muted)", fontWeight: 300, lineHeight: 1.6, marginBottom: 14, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {r.hero_lead}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid var(--border)", fontFamily: "'Syne',sans-serif", fontSize: "0.7rem", fontWeight: 600, color: "var(--muted)" }}>
                          <span>{r.category}</span>
                          <span style={{ color: rColor }}>{rVerdict}</span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </section>
        </Reveal>
      )}

      
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

function FaqItem({ question, answer, isFirst, isLast }: { question: string; answer: string; isFirst: boolean; isLast: boolean }) {
  return (
    <details
      className="faq-item"
      style={{ borderTop: !isFirst ? "1.5px solid var(--border)" : "none" }}
    >
      <summary className="faq-q">
        {question}
        <span className="faq-icon">+</span>
      </summary>
      <div className="faq-a" style={{ maxHeight: "none", paddingBottom: 18 }}>
        {answer}
      </div>
    </details>
  );
}
