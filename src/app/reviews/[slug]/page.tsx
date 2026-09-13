import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import ScoreBadge from "@/components/ScoreBadge";
import AuthorBox from "@/components/AuthorBox";
import TLDRBox from "@/components/TLDRBox";
import ProsCons from "@/components/ProsCons";
import ComparisonTable from "@/components/ComparisonTable";
import StickyCTA from "@/components/StickyCTA";
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

function generateForWhom(review: Review): { forWhom: string; notForWhom: string; verdict: string } {
  const category = review.category || "essa categoria";
  const product = review.product;
  const score = review.verdict_score;

  let verdict: string;
  if (score >= 9) {
    verdict = `${product} é uma excelente escolha na categoria ${category}. Recomendamos fortemente.`;
  } else if (score >= 7) {
    verdict = `${product} é uma boa opção na categoria ${category}. Vale a pena considerar.`;
  } else if (score >= 5) {
    verdict = `${product} é razoável na categoria ${category}. Existem alternativas melhores.`;
  } else {
    verdict = `${product} não se destaca na categoria ${category}. Recomendamos buscar alternativas.`;
  }

  const forWhom =
    review.pros.length > 0
      ? `Ideal para quem busca ${review.pros[0].toLowerCase()}${
          review.pros[1] ? ` e ${review.pros[1].toLowerCase()}` : ""
        }.`
      : `Indicado para quem procura um produto na categoria ${category}.`;

  const notForWhom =
    review.cons.length > 0
      ? `Evite se você precisa de ${review.cons[0].toLowerCase()}${
          review.cons[1] ? ` ou ${review.cons[1].toLowerCase()}` : ""
        }.`
      : `Não é a melhor escolha se você busca o topo da linha em ${category}.`;

  return { forWhom, notForWhom, verdict };
}

export default async function ReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const review = await fetchReviewBySlug(slug);

  if (!review) {
    notFound();
  }

  const { forWhom, notForWhom, verdict } = generateForWhom(review);
  const totalContentLength = review.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 500;
  const readTime = `${Math.max(3, Math.ceil(totalContentLength / 1000))} min de leitura`;

  const allReviews = await fetchAllReviews();
  const related = allReviews
    .filter((r) => r.category === review.category && r.slug !== review.slug)
    .slice(0, 3);

  return (
    <>
      <ReviewSchema review={review} />
      <Navbar />
      <main className="container py-8">
        <Breadcrumbs
          items={[
            { label: "Reviews", href: "/reviews" },
            { label: review.product, href: `/reviews/${review.slug}` },
          ]}
        />

        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
              {review.image_url && (
                <div className="relative w-full sm:w-48 h-48 bg-[var(--surface)] rounded-2xl overflow-hidden flex-shrink-0">
                  <Image
                    src={review.image_url}
                    alt={review.product}
                    fill
                    className="object-contain p-4"
                    sizes="192px"
                  />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                  {review.product}
                </h1>
                <p className="text-[var(--muted)] mb-4 leading-relaxed">
                  {review.hero_lead}
                </p>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={review.verdict_score} />
                  <span className="text-lg font-bold text-[var(--green)]">
                    {review.price_new}
                  </span>
                  <span className="bg-[var(--surface3)] text-xs text-[var(--muted)] px-2.5 py-1 rounded-full">
                    {review.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <TLDRBox
                score={review.verdict_score}
                price={review.price_new}
                forWhom={forWhom}
                notForWhom={notForWhom}
                verdict={verdict}
                pros={review.pros}
                cons={review.cons}
              />
            </div>

            <div className="mb-8">
              <AuthorBox
                name="Editor Vetor"
                bio="Especialista em análise de produtos tech"
                date={review.created_at}
                readTime={readTime}
              />
            </div>

            {review.sections && review.sections.length > 0 && (
              <div className="mb-10">
                <ReviewContent sections={review.sections} />
              </div>
            )}

            {review.pros.length > 0 || review.cons.length > 0 ? (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-5">
                  Vantagens e Desvantagens
                </h2>
                <ProsCons pros={review.pros} cons={review.cons} />
              </div>
            ) : null}

            {review.compare_table && review.compare_table.rows.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-5">Comparação</h2>
                <ComparisonTable
                  headers={["Característica", ...review.compare_table.columns]}
                  rows={review.compare_table.rows.map((row) => {
                    // Handle malformed data where values might be stored as indexed keys
                    let vals: string[];
                    if (Array.isArray(row.values)) {
                      vals = row.values;
                    } else if (row && typeof row === 'object') {
                      // Extract indexed properties (0, 1, 2, ...) as values
                      vals = Object.keys(row)
                        .filter((k) => /^\d+$/.test(k))
                        .sort((a, b) => Number(a) - Number(b))
                        .map((k) => String((row as unknown as Record<string, unknown>)[k]));
                    } else {
                      vals = [];
                    }
                    return {
                      product: row.feature || '',
                      values: vals,
                      highlight: row.winner === review.compare_table.winnerCol,
                    };
                  })}
                />
              </div>
            )}

            {review.faq && review.faq.length > 0 && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-5">Perguntas Frequentes</h2>
                <div className="space-y-4">
                  {review.faq.map((item, i) => (
                    <details
                      key={i}
                      className="bg-[var(--surface)] border border-white/5 rounded-xl overflow-hidden group"
                    >
                      <summary className="cursor-pointer px-5 py-4 font-semibold text-[var(--text)] hover:bg-white/5 transition-colors">
                        {item.question}
                      </summary>
                      <div className="px-5 pb-4 text-sm text-[var(--muted)] leading-relaxed">
                        {item.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {review.verdict_label && (
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-5">Veredicto</h2>
                <div className="bg-[var(--surface)] border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <ScoreBadge score={review.verdict_score} size="lg" />
                    <h3 className="text-xl font-bold">{review.verdict_label}</h3>
                  </div>
                  <p className="text-[var(--muted)] leading-relaxed mb-3">
                    {review.verdict_text}
                  </p>
                  {review.verdict_note && (
                    <p className="text-xs text-[var(--muted)] italic">
                      {review.verdict_note}
                    </p>
                  )}
                </div>
              </div>
            )}

            {related.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/8">
                <h2 className="text-2xl font-bold mb-6">
                  Reviews Relacionados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {related.map((r) => (
                    <a
                      key={r.slug}
                      href={`/reviews/${r.slug}`}
                      className="bg-[var(--surface)] border border-white/5 rounded-xl p-4 hover:border-[var(--blue)]/30 transition-colors"
                    >
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-[var(--blue)]">
                        {r.product}
                      </h3>
                      <p className="text-xs text-[var(--muted)] line-clamp-2">
                        {r.hero_lead}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="bg-[var(--surface)] border border-white/8 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <ScoreBadge score={review.verdict_score} size="lg" />
                  <div>
                    <p className="text-2xl font-bold text-[var(--green)]">
                      {review.price_new}
                    </p>
                    {review.price_old && (
                      <p className="text-xs text-[var(--muted)] line-through">
                        {review.price_old}
                      </p>
                    )}
                    <p className="text-xs text-[var(--muted)]">
                      {review.marketplace}
                    </p>
                  </div>
                </div>
                {review.affiliate_url && (
                  <a
                    href={review.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-[var(--blue)] text-white text-sm font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Ver Menor Preço
                  </a>
                )}
              </div>

              {review.hero_bars && review.hero_bars.length > 0 && (
                <div className="bg-[var(--surface)] border border-white/8 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold mb-3">Pontuações</h3>
                  <div className="space-y-3">
                    {review.hero_bars.map((bar, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--muted)]">{bar.label}</span>
                          <span className="font-medium">{bar.value}/10</span>
                        </div>
                        <div className="h-2 bg-[var(--surface3)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--blue)] rounded-full transition-all"
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.specs && review.specs.length > 0 && (
                <div className="bg-[var(--surface)] border border-white/8 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold mb-3">Especificações</h3>
                  <dl className="space-y-2">
                    {review.specs.map((spec, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <dt className="text-[var(--muted)]">{spec.label}</dt>
                        <dd className={`font-medium ${spec.highlight ? "text-[var(--blue)]" : ""}`}>
                          {spec.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {review.pros.length > 0 && (
                <div className="bg-[var(--surface)] border border-white/8 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-[var(--green)] mb-3">
                    Principais Prós
                  </h3>
                  <ul className="space-y-2">
                    {review.pros.slice(0, 4).map((pro, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-[var(--muted)]"
                      >
                        <svg
                          className="w-3.5 h-3.5 mt-0.5 text-[var(--green)] flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
      <StickyCTA
        price={review.price_new}
        productName={review.product}
      />
      <Footer />
    </>
  );
}
