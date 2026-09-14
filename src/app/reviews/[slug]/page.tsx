import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgressBar from "@/components/ProgressBar";
import ScoreBars from "@/components/ScoreBars";
import ProsCons from "@/components/ProsCons";
import SpecTable from "@/components/SpecTable";
import Reveal from "@/components/Reveal";
import ReviewContent from "@/components/ReviewContent";
import { ReviewSchema } from "@/components/SchemaMarkup";
import { fetchReviewBySlug, fetchAllReviews } from "@/lib/data";
import type { Review } from "@/lib/types";
import StickyReviewNav from "@/components/StickyReviewNav";

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
  return {
    title: review.meta_title || review.product,
    description: review.meta_description || review.hero_lead,
    openGraph: {
      title: review.meta_title || review.product,
      description: review.meta_description || review.hero_lead,
      images: review.image_url ? [review.image_url] : [],
    },
  };
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
  const heroBars = Array.isArray(review.hero_bars) ? review.hero_bars : [];
  const sections = Array.isArray(review.sections) ? review.sections : [];
  const testimonials = Array.isArray(review.testimonials) ? review.testimonials as Array<{ name?: string; quote?: string; stars?: number; role?: string; platform?: string }> : [];
  const faq = Array.isArray(review.faq) ? review.faq : [];

  const sectionNav = sections.slice(0, 7).map((s) => ({ id: s.id, label: s.heading }));

  const verdictBgs = score >= 8
    ? { badge: "rgba(16,185,129,0.15)", badgeBorder: "rgba(16,185,129,0.4)", badgeText: "#6EE7B7" }
    : score >= 5
    ? { badge: "rgba(217,119,6,0.15)", badgeBorder: "rgba(217,119,6,0.4)", badgeText: "#FCD34D" }
    : { badge: "rgba(220,38,38,0.15)", badgeBorder: "rgba(220,38,38,0.4)", badgeText: "#FCA5A5" };

  return (
    <>
      <ProgressBar />
      <ReviewSchema review={review} />

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
           HERO
      ============================================================ */}
      <section className="hero" id="topo">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 font-heading font-extrabold text-[0.7rem] tracking-[0.04em]" style={{ background: "#DCFCE7", color: "#15803D", border: "1.5px solid #BBF7D0", borderRadius: 4 }}>
              ✓ &nbsp;Review · {review.category}
            </div>

            <h1 className="font-display mb-4" style={{ fontSize: "clamp(3rem, 6vw, 5.2rem)", lineHeight: 0.95, letterSpacing: "0.01em", color: "var(--ink)" }}>
              {review.hero_headline_line1 && (
                <>{review.hero_headline_line1}<br /></>
              )}
              {review.hero_headline_line2 || review.product}
              {review.hero_headline_em && (
                <span className="text-blue"> {review.hero_headline_em}</span>
              )}
            </h1>

            <p className="text-[1.05rem] text-body leading-[1.8] max-w-[520px] mb-7 font-light">
              {review.hero_lead}
            </p>

            {score > 0 && (
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className="star" style={{ color: star <= starCount ? "var(--amber)" : "#D1D5DB", fontSize: "1.2rem" }}>
                    ★
                  </span>
                ))}
                <span className="font-heading text-[0.78rem] font-bold text-body ml-1.5">{(score / 2).toFixed(1)} / 5 — {score >= 8 ? "Excelente" : score >= 6 ? "Bom" : "Razoável"}</span>
              </div>
            )}

            {quickFacts.length > 0 && (
              <div className="flex flex-wrap overflow-hidden rounded-lg mb-8" style={{ border: "1.5px solid var(--border2)", background: "var(--bg)" }}>
                {quickFacts.map((spec, i) => (
                  <div key={i} className="qf-item flex-1 min-w-[100px] text-center" style={{ padding: "14px 16px", borderRight: i < quickFacts.length - 1 ? "1.5px solid var(--border)" : "none" }}>
                    <span className="font-display text-blue block" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", lineHeight: 1 }}>{spec.value}</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--muted)", fontFamily: "'Syne',sans-serif", fontWeight: 700, letterSpacing: "0.04em" }}>{spec.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              {review.affiliate_url && (
                <a
                  href={review.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="btn-cta"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Ver Preço Atualizado
                </a>
              )}
              <a href="#review-body" className="btn-sec">Ler review completo ↓</a>
            </div>
          </div>

          <div className="relative">
            {review.image_url && (
              <>
                <span className="hero-score-bg">{score.toFixed(1)}</span>
                <Image
                  src={review.image_url}
                  alt={review.product}
                  width={420}
                  height={420}
                  className="hero-img"
                  style={{ borderRadius: "12px 12px 0 0", objectPosition: "center bottom" }}
                  priority
                />
              </>
            )}
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
                <h3>Compre se você busca…</h3>
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
                <h3>Pule se você precisa de…</h3>
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
           REVIEW BODY
      ============================================================ */}
      <div className="content" id="review-body">
        <div className="max-w-[1100px] mx-auto py-[72px]">
          <article className="max-w-[680px]" style={{ textAlign: "left" }}>
            {sections.length > 0 && (
              <ReviewContent sections={sections} />
            )}

            {review.specs && review.specs.length > 0 && (
              <>
                <h2 className="sec-h mt-12 mb-4">Ficha Técnica</h2>
                <SpecTable specs={review.specs} />
              </>
            )}
          </article>
        </div>
      </div>

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
           BUY CTA
      ============================================================ */}
      {review.affiliate_url && (
        <section className="buy-sec" id="comprar">
          <div className="buy-inner">
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <span className="sec-label">Oferta verificada</span>
              <h2 className="sec-h">Onde comprar pelo melhor preço</h2>
              <p style={{ color: "var(--body)", fontWeight: 300, fontSize: "0.92rem" }}>Encontramos a melhor oferta disponível neste momento. Preço pode variar.</p>
            </div>

            <div className="buy-card">
              <div className="buy-card-head">
                <span className="buy-card-head-title">🏅 Melhor Oferta Disponível — {review.marketplace || "Mercado Livre"}</span>
                <span className="buy-card-head-badge">OFERTA VERIFICADA</span>
              </div>
              <div className="buy-card-body">
                <div>
                  <div className="buy-product-name">{review.product}</div>
                  <ul className="buy-features">
                    {(review.specs || []).slice(0, 6).map((spec, i) => (
                      <li key={i}>{spec.label}: {spec.value}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 300 }}>
                    ✓ Venda verificada &nbsp;·&nbsp; ✓ Garantia inclusa
                  </div>
                </div>
                <div className="buy-price-block">
                  {review.price_old && (
                    <div className="buy-old-price">De {review.price_old}</div>
                  )}
                  <div className="buy-main-price">{review.price_new || "Consultar"}</div>
                  <div className="buy-period">no Pix · ou parcele</div>
                  <a
                    href={review.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="btn-buy"
                  >
                    Comprar Agora
                  </a>
                  <div className="buy-note">Você será direcionado ao {review.marketplace || "Mercado Livre"}</div>
                </div>
              </div>
              <div className="guarantee-band">
                <div className="guarantee-seal">🛡️</div>
                <div className="guarantee-text">
                  <h4>Compra 100% protegida</h4>
                  <p>Garantia de devolução e produto original. Você conta com suporte completo.</p>
                </div>
              </div>
            </div>

            <div className="trust-row">
              {["🔒 Pagamento seguro", "🚚 Frete grátis", "🏭 Produto original", "📋 Nota fiscal", "↩️ Devolução em 7 dias"].map((item) => (
                <div key={item} className="trust-item">
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
           RELATED REVIEWS
      ============================================================ */}
      {related.length > 0 && (
        <Reveal>
          <section style={{ padding: "72px 32px", background: "var(--surface)" }}>
            <div className="max-w-[1100px] mx-auto">
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
                          <Image src={r.image_url} alt={r.product} fill style={{ objectFit: "cover" }} sizes="(max-width: 640px) 100vw, 33vw" />
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

      <Footer />
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
