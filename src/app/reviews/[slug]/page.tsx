import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProgressBar from "@/components/ProgressBar";
import ScoreRing from "@/components/ScoreRing";
import MiniBars from "@/components/MiniBars";
import ScoreBars from "@/components/ScoreBars";
import ProsCons from "@/components/ProsCons";
import SpecTable from "@/components/SpecTable";
import TOCSidebar from "@/components/TOCSidebar";
import VerdictBox from "@/components/VerdictBox";
import Reveal from "@/components/Reveal";
import ReviewContent from "@/components/ReviewContent";
import { ReviewSchema } from "@/components/SchemaMarkup";
import { fetchReviewBySlug, fetchAllReviews } from "@/lib/data";
import type { Review } from "@/lib/types";

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

function getScoreRating(score: number): string {
  if (score >= 8) return "Excelente";
  if (score >= 6) return "Bom";
  if (score >= 4) return "Razoável";
  return "Fraco";
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

  const sectionNav = review.sections?.map((s) => ({ id: s.id, label: s.heading })).slice(0, 7) || [];

  return (
    <>
      <ProgressBar />
      <ReviewSchema review={review} />
      <Navbar />

      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Reviews", href: "/reviews" },
          { label: review.category },
          { label: review.product },
        ]}
      />

      {/* ============================================================
           HERO
      ============================================================ */}
      <section className="bg-surface border-b border-border overflow-hidden" style={{ padding: "64px 32px 0" }}>
        <div className="max-w-[1100px] mx-auto grid gap-12 items-end" style={{ gridTemplateColumns: "1fr 460px" }}>
          <div style={{ paddingBottom: 64 }}>
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
                  <span key={star} style={{ fontSize: "1.2rem", color: star <= starCount ? "var(--amber)" : "var(--border2)" }}>
                    ★
                  </span>
                ))}
                <span className="font-heading text-[0.78rem] font-bold text-body ml-1.5">{(score / 2).toFixed(1)} / 5 — {getScoreRating(score)}</span>
              </div>
            )}

            {/* Quick Facts */}
            {quickFacts.length > 0 && (
              <div className="flex flex-wrap overflow-hidden rounded-lg mb-8" style={{ border: "1.5px solid var(--border2)", background: "var(--bg)" }}>
                {quickFacts.map((spec, i) => (
                  <div key={i} className="flex-1 min-w-[100px] text-center py-3.5 px-4" style={{ borderRight: i < quickFacts.length - 1 ? "1.5px solid var(--border)" : "none" }}>
                    <span className="font-display text-blue block" style={{ fontSize: "1.5rem", lineHeight: 1 }}>{spec.value}</span>
                    <span className="font-heading text-[0.65rem] font-bold text-muted tracking-[0.04em]">{spec.label}</span>
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
                  className="inline-flex items-center gap-2.5 bg-cta text-white font-heading font-extrabold text-[0.9rem] tracking-[0.03em] px-8 py-4 rounded-md transition-colors hover:bg-cta-dk"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Ver Preço Atualizado
                </a>
              )}
              <a href="#review-body" className="font-heading text-[0.8rem] font-bold text-blue border-b border-blue hover:text-cta hover:border-cta transition-colors">
                Ler review completo ↓
              </a>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            {review.image_url && (
              <>
                <span className="absolute top-5 right-[-10px] font-display pointer-events-none select-none" style={{ fontSize: "9rem", color: "rgba(29,78,216,0.06)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {score.toFixed(1)}
                </span>
                <Image
                  src={review.image_url}
                  alt={review.product}
                  width={460}
                  height={480}
                  className="w-full block object-cover max-h-[480px]"
                  style={{ borderRadius: "12px 12px 0 0", objectPosition: "center bottom" }}
                  priority
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
           SCORE BREAKDOWN (Dark Band)
      ============================================================ */}
      {review.hero_bars && review.hero_bars.length > 0 && (
        <section className="bg-ink text-white py-16 px-8">
          <div className="max-w-[1100px] mx-auto">
            <div className="grid gap-8 items-center mb-12" style={{ gridTemplateColumns: "1fr auto" }}>
              <div>
                <span className="sec-label" style={{ color: "#93C5FD", borderBottomColor: "#93C5FD" }}>Pontuação detalhada</span>
                <h2 className="sec-h text-white mb-1.5">Como avaliamos cada critério</h2>
                <p className="text-white/55 text-[0.88rem] font-light">Cada critério foi avaliado com base em uso real, comparando com concorrentes na mesma faixa de preço.</p>
              </div>
              <div className="text-center">
                <span className="font-display text-amber block" style={{ fontSize: "7rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {score.toFixed(1)}
                </span>
                <span className="font-heading text-[0.72rem] font-bold text-white/45 tracking-[0.1em]">NOTA FINAL / 10</span>
              </div>
            </div>
            <ScoreBars bars={review.hero_bars.map((b) => ({ label: b.label, score: b.value }))} />
          </div>
        </section>
      )}

      {/* ============================================================
           REVIEW BODY + TOC SIDEBAR
      ============================================================ */}
      <div className="max-w-[1100px] mx-auto px-8 py-[72px] grid gap-16 items-start" style={{ gridTemplateColumns: "1fr 280px" }} id="review-body">
        <article className="max-w-[680px]">
          {review.sections && review.sections.length > 0 && (
            <ReviewContent sections={review.sections} />
          )}

          {review.specs && review.specs.length > 0 && (
            <>
              <h2 className="sec-h mt-12 mb-4">Ficha Técnica</h2>
              <SpecTable specs={review.specs} />
            </>
          )}

          {review.pros.length > 0 || review.cons.length > 0 ? (
            <>
              <h2 className="sec-h mt-12 mb-4">Prós e Contras</h2>
              <ProsCons pros={review.pros} cons={review.cons} />
            </>
          ) : null}

          {/* Comparison Table */}
          {review.compare_table && review.compare_table.rows && review.compare_table.rows.length > 0 && (
            <>
              <h2 className="sec-h mt-12 mb-4">Comparativo</h2>
              <div className="overflow-x-auto my-8">
                <table className="w-full border-collapse" style={{ border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <thead>
                    <tr>
                      {review.compare_table.columns.map((col, i) => (
                        <th
                          key={i}
                          className="py-4 px-5 text-left font-heading text-[0.78rem] font-bold tracking-[0.04em]"
                          style={{
                            background: i === review.compare_table.winnerCol ? "var(--blue)" : "var(--ink)",
                            color: "#fff",
                            borderRight: i < review.compare_table.columns.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {review.compare_table.rows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                        <td className="py-3.5 px-5 font-heading font-bold text-[0.8rem] text-ink">{row.feature}</td>
                        {row.values.map((val, vi) => (
                          <td
                            key={vi}
                            className="py-3.5 px-5 text-[0.9rem] font-light"
                            style={{
                              background: vi === review.compare_table.winnerCol ? "var(--blue-lt)" : "transparent",
                              color: vi === review.compare_table.winnerCol ? "var(--blue)" : "var(--body)",
                              fontWeight: vi === review.compare_table.winnerCol ? 600 : 300,
                            }}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* FAQ */}
          {review.faq && review.faq.length > 0 && (
            <Reveal>
              <div className="mt-12">
                <span className="sec-label">Dúvidas frequentes</span>
                <h2 className="sec-h mb-0">Perguntas que todo mundo faz</h2>
                <div className="mt-9">
                  {review.faq.map((item, i) => (
                    <FaqItem key={i} question={item.question} answer={item.answer} isFirst={i === 0} isLast={i === review.faq.length - 1} />
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </article>

        {/* TOC SIDEBAR */}
        <aside className="hidden lg:block">
          <TOCSidebar
            sections={review.sections || []}
            score={score}
            affiliateUrl={review.affiliate_url}
          />
        </aside>
      </div>

      {/* ============================================================
           VERDICT (Dark Section)
      ============================================================ */}
      <Reveal>
        <VerdictBox
          score={score}
          label={verdictLabel}
          text={verdictText}
          note={review.verdict_note}
          affiliateUrl={review.affiliate_url}
        />
      </Reveal>

      {/* ============================================================
           BUY CTA
      ============================================================ */}
      {review.affiliate_url && (
        <section className="py-[72px] px-8 border-b border-border">
          <div className="max-w-[860px] mx-auto">
            <div className="text-center mb-8">
              <span className="sec-label">Oferta verificada</span>
              <h2 className="sec-h">Onde comprar pelo melhor preço</h2>
              <p className="text-body font-light text-[0.92rem]">Encontramos a melhor oferta disponível neste momento. Preço pode variar.</p>
            </div>

            <div style={{ border: "2px solid var(--cta)", borderRadius: 12, overflow: "hidden" }}>
              <div className="bg-cta text-white py-4 px-8 flex items-center justify-between gap-4">
                <span className="font-heading font-extrabold text-[0.78rem] tracking-[0.08em]">
                  🏅 Melhor Oferta Disponível — {review.marketplace || "Mercado Livre"}
                </span>
                <span className="bg-white/20 rounded px-2.5 py-0.5 text-[0.65rem] font-heading font-extrabold tracking-[0.08em]">
                  OFERTA VERIFICADA
                </span>
              </div>
              <div className="bg-bg py-10 px-10 grid gap-10 items-center" style={{ gridTemplateColumns: "1fr auto" }}>
                <div>
                  <div className="font-display text-ink mb-2.5" style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", lineHeight: 1 }}>
                    {review.product}
                  </div>
                  <ul className="flex flex-col gap-2 mb-6">
                    {(review.specs || []).slice(0, 6).map((spec, i) => (
                      <li key={i} className="text-[0.88rem] text-body font-light pl-[22px] relative">
                        <span className="absolute left-0 font-bold text-green">✓</span>
                        {spec.label}: {spec.value}
                      </li>
                    ))}
                  </ul>
                  <div className="text-[0.8rem] text-muted font-light">
                    ✓ Venda verificada &nbsp;·&nbsp; ✓ Garantia inclusa
                  </div>
                </div>
                <div className="text-center">
                  {review.price_old && (
                    <div className="text-[0.88rem] text-muted line-through mb-1">De {review.price_old}</div>
                  )}
                  <div className="font-display text-cta" style={{ fontSize: "4rem", lineHeight: 1 }}>
                    {review.price_new || "Consultar"}
                  </div>
                  <div className="text-[0.76rem] text-muted font-light mb-4">no Pix · ou parcele</div>
                  <a
                    href={review.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="block text-center bg-cta text-white font-heading font-extrabold text-[1rem] tracking-[0.03em] py-4 rounded-md transition-colors hover:bg-cta-dk"
                  >
                    Comprar Agora
                  </a>
                  <div className="text-[0.68rem] text-muted mt-2 font-light">Você será direcionado ao {review.marketplace || "Mercado Livre"}</div>
                </div>
              </div>
              <div className="bg-surface border-t border-border py-6 px-10 flex items-center gap-5 flex-wrap">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-[1.8rem] shrink-0" style={{ background: "#F0FDF4", border: "2.5px solid #BBF7D0" }}>🛡️</div>
                <div>
                  <h4 className="font-heading font-extrabold text-[0.85rem] text-ink mb-0.5">Compra 100% protegida</h4>
                  <p className="text-[0.8rem] text-body font-light leading-[1.6]">Garantia de devolução e produto original. Você conta com suporte completo.</p>
                </div>
              </div>
            </div>

            <div className="py-6 flex items-center justify-center gap-8 flex-wrap border-b border-border">
              {["🔒 Pagamento seguro", "🚚 Frete grátis", "🏭 Produto original", "📋 Nota fiscal", "↩️ Devolução em 7 dias"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 font-heading text-[0.74rem] font-bold text-muted">
                  {item}
                </div>
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
          <section className="bg-surface py-[72px] px-8">
            <div className="max-w-[1100px] mx-auto">
              <span className="sec-label">Continue lendo</span>
              <h2 className="sec-h">Outros Reviews</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-9">
                {related.map((r) => {
                  const rScore = r.verdict_score || r.hero_overall_score;
                  const rVerdict = rScore >= 8 ? "✓ Recomendado" : rScore >= 5 ? "Razoável" : "Não Recomendado";
                  const rColor = rScore >= 8 ? "text-green" : rScore >= 5 ? "text-amber" : "text-red";
                  return (
                    <a
                      key={r.slug}
                      href={`/reviews/${r.slug}`}
                      className="group bg-bg border border-border rounded-[10px] overflow-hidden transition-all duration-300 hover:border-blue/30 hover:-translate-y-1"
                    >
                      {r.image_url && (
                        <div className="relative h-[180px] overflow-hidden">
                          <Image src={r.image_url} alt={r.product} fill className="object-cover transition-transform duration-400 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-border rounded px-2.5 py-[3px] font-heading text-[0.64rem] font-bold tracking-wider uppercase text-body">
                            {r.category}
                          </span>
                          {rScore > 0 && (
                            <span className="absolute top-3 right-3 bg-blue text-white font-display rounded-lg px-2.5 py-0.5" style={{ fontSize: "1.3rem", lineHeight: 1.3 }}>
                              {rScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-heading font-extrabold text-[0.95rem] text-ink mb-1.5 leading-snug group-hover:text-blue transition-colors">
                          {r.product}
                        </h3>
                        <p className="text-[0.82rem] text-muted font-light leading-[1.6] mb-3.5 line-clamp-2">
                          {r.hero_lead}
                        </p>
                        <div className="flex items-center justify-between pt-3 border-t border-border font-heading text-[0.7rem] font-semibold text-muted">
                          <span>{r.category}</span>
                          <span className={rColor}>{rVerdict}</span>
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

/* ============================================================
   FAQ Item (Client Component)
============================================================ */
function FaqItem({ question, answer, isFirst, isLast }: { question: string; answer: string; isFirst: boolean; isLast: boolean }) {
  return (
    <details
      className="group border-b border-border"
      style={{ borderTop: isFirst ? "1.5px solid var(--border)" : "none" }}
    >
      <summary className="flex items-center justify-between py-4 cursor-pointer gap-4 font-heading font-bold text-[0.92rem] text-ink hover:text-blue transition-colors list-none">
        {question}
        <span className="text-blue text-[1.2rem] transition-transform group-open:rotate-45 shrink-0">+</span>
      </summary>
      <div className="text-[0.9rem] text-body font-light leading-[1.8] pb-4">
        {answer}
      </div>
    </details>
  );
}
