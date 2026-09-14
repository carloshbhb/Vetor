import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
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

export default async function ReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const review = await fetchReviewBySlug(slug);
  if (!review) notFound();

  const score = review.verdict_score || review.hero_overall_score;
  const verdictLabel = review.verdict_label || (score >= 8 ? "Fortemente Recomendado" : score >= 5 ? "Recomendado" : "Não Recomendado");
  const verdictText = review.verdict_text || generateVerdictText(review);
  const pillStyle =
    score >= 8
      ? { bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.25)", fg: "var(--green)" }
      : score >= 5
        ? { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.25)", fg: "var(--amber)" }
        : { bg: "rgba(239,68,68,0.12)", bd: "rgba(239,68,68,0.25)", fg: "var(--red)" };
  const totalContentLength = review.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 500;
  const readTime = `${Math.max(3, Math.ceil(totalContentLength / 1000))} min de leitura`;

  const allReviews = await fetchAllReviews();
  const related = allReviews
    .filter((r) => r.category === review.category && r.slug !== review.slug)
    .slice(0, 3);

  return (
    <>
      <ReviewSchema review={review} />
      <AnnouncementBar />
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

      {/* HERO */}
      <section className="max-w-[1200px] mx-auto px-6 md:px-12 pt-9 pb-14 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-14 items-start relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 100% 40%, rgba(245,158,11,0.05) 0%, transparent 70%)" }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 mb-[22px] px-3.5 py-[5px] rounded-full font-heading font-bold text-[0.7rem] tracking-[0.1em] uppercase" style={{ background: "var(--amber-bg)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--amber)" }}>
            <span className="w-[5px] h-[5px] rounded-full bg-amber" />
            Review · {review.category}
          </div>

          <h1 className="font-display leading-[0.93] mb-5" style={{ fontSize: "clamp(3rem, 6vw, 5.6rem)", letterSpacing: "0.01em" }}>
            {review.product}
          </h1>

          <div className="flex items-center gap-4 flex-wrap mb-[22px] font-heading text-[0.76rem] font-semibold text-muted">
            <span className="text-amber">por Editor Vetor</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <span>{readTime}</span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
            <span>{new Date(review.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
          </div>

          {score > 0 && (
            <div className="flex items-center gap-[3px] mb-[18px]">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} style={{ fontSize: "0.9rem", color: star <= Math.round(score / 2) ? "var(--amber)" : "rgba(255,255,255,0.12)" }}>
                  ★
                </span>
              ))}
              <span className="font-heading text-[0.7rem] font-bold text-muted ml-1">{(score / 2).toFixed(1)} / 5 — {verdictLabel}</span>
            </div>
          )}

          <p className="text-[1.05rem] text-[#9AA8C4] leading-[1.8] max-w-[620px] mb-7 font-light">
            {review.hero_lead}
          </p>

          {review.specs && review.specs.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-8">
              {review.specs.slice(0, 7).map((spec, i) => (
                <span key={i} className="bg-surface2 border border-border rounded-md px-3 py-1 font-heading text-[0.68rem] font-bold tracking-wider text-muted">
                  {spec.value}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            {review.affiliate_url && (
              <a
                href={review.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-2.5 bg-amber text-black font-heading font-extrabold text-[0.88rem] tracking-wide px-8 py-3.5 rounded-full transition-all hover:bg-white hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(245,158,11,0.3)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                Comprar Agora
              </a>
            )}
            <a href="#review-body" className="inline-flex items-center gap-2 border border-border text-muted font-heading font-bold text-[0.82rem] px-6 py-3.5 rounded-full transition-all hover:border-white/20 hover:text-text">
              Ler análise completa ↓
            </a>
          </div>
        </div>

        {/* SCORE CARD */}
        <aside
          className="bg-surface border rounded-3xl w-[300px] shrink-0 sticky"
          style={{
            top: 88,
            padding: "32px 28px 28px",
            borderColor: "rgba(245,158,11,0.15)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          <ScoreRing score={score} size={140} />

          <div
            className="block text-center mt-6 mb-[22px] py-1.5 rounded-lg font-heading font-extrabold text-[0.72rem] tracking-[0.12em] uppercase"
            style={{ background: pillStyle.bg, border: `1px solid ${pillStyle.bd}`, color: pillStyle.fg }}
          >
            ✓ {verdictLabel}
          </div>

          {review.hero_bars && review.hero_bars.length > 0 && (
            <MiniBars bars={review.hero_bars.map((b) => ({ label: b.label, score: b.value }))} />
          )}

          {review.affiliate_url && (
            <>
              <a
                href={review.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block text-center bg-amber text-black font-heading font-extrabold text-[0.82rem] tracking-wide py-3.5 rounded-xl transition-all hover:bg-white hover:shadow-[0_8px_24px_rgba(245,158,11,0.3)]"
              >
                Comprar Agora
              </a>
              <p className="text-center text-[0.68rem] text-muted mt-2 font-light">Via Mercado Livre · Frete Grátis</p>
            </>
          )}
        </aside>
      </section>

      {/* PRODUCT IMAGE STRIP */}
      {review.image_url && (
        <div className="bg-surface border-y border-border overflow-hidden relative">
          <Image
            src={review.image_url}
            alt={review.product}
            width={1200}
            height={420}
            className="w-full max-h-[420px] object-cover opacity-85"
            style={{ objectPosition: "center 30%" }}
          />
          <div className="absolute bottom-0 left-0 right-0 px-12 py-6 flex items-end justify-between gap-5" style={{ background: "linear-gradient(transparent, rgba(7,9,15,0.96))" }}>
            <p className="text-[0.78rem] text-muted max-w-[500px] leading-relaxed"><em>{review.hero_lead}</em></p>
          </div>
        </div>
      )}

      {/* REVIEW BODY */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-16 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-16 items-start" id="review-body">
        <article className="max-w-[680px]">
          {review.sections && review.sections.length > 0 && (
            <ReviewContent sections={review.sections} />
          )}

          {review.hero_bars && review.hero_bars.length > 0 && (
            <>
              <h2 className="font-display tracking-wide mt-12 mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}>
                Notas por Categoria
              </h2>
              <ScoreBars bars={review.hero_bars.map((b) => ({ label: b.label, score: b.value }))} />
            </>
          )}

          {review.specs && review.specs.length > 0 && (
            <>
              <h2 className="font-display tracking-wide mt-12 mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}>
                Ficha Técnica
              </h2>
              <SpecTable specs={review.specs} />
            </>
          )}

          {review.pros.length > 0 || review.cons.length > 0 ? (
            <>
              <h2 className="font-display tracking-wide mt-12 mb-4" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}>
                Prós e Contras
              </h2>
              <ProsCons pros={review.pros} cons={review.cons} />
            </>
          ) : null}

          <Reveal>
            <VerdictBox
              score={score}
              label={verdictLabel}
              text={verdictText}
              note={review.verdict_note}
              affiliateUrl={review.affiliate_url}
            />
          </Reveal>
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

      {/* RELATED REVIEWS */}
      {related.length > 0 && (
        <Reveal>
          <section className="bg-surface border-t border-border py-16 px-6 md:px-12">
          <div className="max-w-[1200px] mx-auto">
            <div className="font-heading font-bold text-[0.72rem] tracking-[0.18em] uppercase text-amber mb-2.5">
              Continue lendo
            </div>
            <h2 className="font-display leading-none mb-9" style={{ fontSize: "clamp(2rem, 4vw, 3.4rem)" }}>
              OUTROS REVIEWS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((r) => {
                const rScore = r.verdict_score || r.hero_overall_score;
                const rVerdict = rScore >= 8 ? "✓ Recomendado" : rScore >= 5 ? "Razoável" : "Não Recomendado";
                const rColor = rScore >= 8 ? "text-green" : rScore >= 5 ? "text-amber" : "text-red";
                return (
                  <a
                    key={r.slug}
                    href={`/reviews/${r.slug}`}
                    className="group bg-bg border border-border rounded-[20px] overflow-hidden transition-all duration-300 hover:border-amber/30 hover:-translate-y-1"
                  >
                    {r.image_url && (
                      <div className="relative h-[180px] overflow-hidden">
                        <Image src={r.image_url} alt={r.product} fill className="object-cover transition-transform duration-400 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 33vw" />
                        <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-border rounded-md px-2.5 py-[3px] font-heading text-[0.64rem] font-bold tracking-wider uppercase text-muted">
                          {r.category}
                        </span>
                        {rScore > 0 && (
                          <span className="absolute top-3 right-3 bg-amber text-black font-display rounded-lg px-2.5 py-0.5" style={{ fontSize: "1.3rem", lineHeight: 1.3 }}>
                            {rScore.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-heading font-extrabold text-[0.95rem] text-text mb-1.5 leading-snug group-hover:text-amber transition-colors">
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