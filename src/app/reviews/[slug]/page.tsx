import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProsCons from "@/components/ProsCons";
import SpecTable from "@/components/SpecTable";
import ReviewContent from "@/components/ReviewContent";
import ScoreBarsStatic from "@/components/ScoreBarsStatic";
import AnswerBox from "@/components/AnswerBox";
import VerdictCard from "@/components/VerdictCard";
import StickyBuyBar from "@/components/StickyBuyBar";
import AdPlacement from "@/components/AdPlacement";
import { ReviewSchema, FAQSchema, BreadcrumbSchema } from "@/components/SchemaMarkup";
import { fetchReviewBySlug, fetchAllReviews, fetchAllViralArticles, normalizeCategoryName } from "@/lib/data";
import { resolveOgImage } from "@/lib/seo";
import type { Review } from "@/lib/types";
import AuthorBox from "@/components/AuthorBox";
import { primaryAuthor } from "@/data/authors";
import BuyingEngine from "@/components/BuyingEngine";
import EditorialEvidence from "@/components/EditorialEvidence";
import RelatedCommercialProducts from "@/components/RelatedCommercialProducts";
import ReviewPurchaseIntentLinks from "@/components/ReviewPurchaseIntentLinks";
import DecisionPath from "@/components/DecisionPath";
import { getProductLinksByReviewSlug, getReviewedProductLinksByCategory } from "@/lib/product-links";
import { getAffiliateLinksForReview, type AffiliateLink } from "@/lib/affiliate-links";
import { buildBuyingGuideCategories, buildBuyingIntentPages, buildMarketplaceOffers, isGuideLikeSlug, reviewScore, parseReviewPrice } from "@/lib/buying";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Permite que ajustes editoriais no Supabase sejam refletidos sem depender
// exclusivamente de um novo build para cada alteração de conteúdo.
export const revalidate = 3600;

export async function generateStaticParams() {
  const reviews = await fetchAllReviews();
  return reviews.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const review = await fetchReviewBySlug(slug);
  if (!review) return { title: "Review não encontrado" };
  const url = `https://www.vetor.blog/reviews/${review.slug}/`;
  const title = review.meta_title || `Review: ${review.product}`;
  const description =
    review.meta_description ||
    review.hero_lead ||
    `Review independente do ${review.product}: nota, prós, contras e onde comprar.`;
  const ogImage = resolveOgImage(review.meta_og_image || review.image_url);
  const publishedTime = review.created_at || undefined;
  const modifiedTime = review.updated_at || publishedTime;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function normalizeComparableText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanEditorialText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/bateria冠军级/gi, "bateria de nível excelente");
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeReviewSections(value: unknown): Review["sections"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const section = raw as unknown as Record<string, unknown>;
    const heading = cleanEditorialText(section.heading ?? section.title) || "Seção " + (index + 1);
    const content = cleanEditorialText(section.content ?? section.body);
    const id = cleanEditorialText(section.id) || "section-" + index;
    const tocLabel = cleanEditorialText(section.tocLabel ?? section.toc_label ?? heading);
    const tocEmoji = cleanEditorialText(section.tocEmoji ?? section.toc_emoji);
    return [{ id, content, heading, tocEmoji, tocLabel }];
  });
}

function normalizeCompareRows(value: unknown): Review["compare_table"]["rows"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (Array.isArray(raw)) {
      const [feature, ...values] = raw;
      return [{ feature: cleanEditorialText(feature), values: values.map(cleanEditorialText), winner: -1 }];
    }
    if (!raw || typeof raw !== "object") return [];
    const row = raw as unknown as Record<string, unknown>;
    const values = Array.isArray(row.values) ? row.values.map(cleanEditorialText) : [];
    return [{
      feature: cleanEditorialText(row.feature),
      values,
      winner: Number.isInteger(row.winner) ? Number(row.winner) : -1,
    }];
  });
}

function normalizeCompareColumns(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanEditorialText);
}
function findComparisonReview(column: string, reviews: Review[], excludedSlug?: string): Review | null {
  const target = normalizeComparableText(column);
  if (!target) return null;
  const targetTokens = new Set(target.split(" ").filter((token) => token.length >= 3));
  let best: { review: Review; score: number } | null = null;

  for (const candidate of reviews) {
    if (candidate.status !== "published" || isGuideLikeSlug(candidate.slug) || candidate.slug === excludedSlug) continue;
    const candidateText = normalizeComparableText(candidate.product);
    if (!candidateText) continue;

    let score = candidateText === target ? 100 : 0;
    if (candidateText.includes(target) || target.includes(candidateText)) score += 50;

    const candidateTokens = new Set(candidateText.split(" ").filter((token) => token.length >= 3));
    let shared = 0;
    for (const token of targetTokens) {
      if (candidateTokens.has(token)) shared += 1;
    }
    score += shared * 4;

    if (!best || score > best.score) best = { review: candidate, score };
  }

  return best && best.score >= 12 ? best.review : null;
}

const br = (n: number) => String(n).replace(".", ",");

function buildCentralMarketplaceOffers(review: Review, links: AffiliateLink[]): import("@/lib/buying").MarketplaceOffer[] {
  const seen = new Set<string>();
  const offers: import("@/lib/buying").MarketplaceOffer[] = [];

  for (const link of links) {
    const marketplace = (link.marketplace || "Outro").trim();
    const key = marketplace.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const price =
      link.price != null && Number.isFinite(link.price)
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(link.price)
        : marketplace.toLowerCase() === (review.marketplace || "").trim().toLowerCase()
          ? review.price_new || ""
          : "";

    offers.push({
      marketplace: key,
      label: marketplace,
      price,
      href: "/go/" + link.slug + "/",
      checkedAt: link.affiliate_checked_at || link.updated_at || review.updated_at,
      isAffiliate: true,
    });
  }

  if (!offers.length && (review.affiliate_url || review.price_new)) {
    offers.push({
      marketplace: (review.marketplace || "mercadolivre").trim().toLowerCase(),
      label: review.marketplace || "Mercado Livre",
      price: review.price_new || "",
      href: review.affiliate_url ? "/go/" + review.slug + "/" : "#",
      checkedAt: review.updated_at,
      isAffiliate: Boolean(review.affiliate_url),
    });
  }

  return offers;
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
  const verdictLabel =
    review.verdict_label ||
    (score >= 8 ? "Fortemente Recomendado" : score >= 5 ? "Recomendado" : "Não Recomendado");
  const verdictText = cleanEditorialText(review.verdict_text || generateVerdictText(review));
  const totalContentLength =
    review.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 500;
  const readTime = review.meta_reading_time
    ? `${review.meta_reading_time} min`
    : `${Math.max(3, Math.ceil(totalContentLength / 1000))} min`;

  const [allReviews, allComparatives, productLinks, relatedCommercialLinks, centralAffiliateLinks] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
    getProductLinksByReviewSlug(review.slug),
    getReviewedProductLinksByCategory(review.category, review.slug, 6),
    getAffiliateLinksForReview(review.slug),
  ]);
  const buyingOffers = centralAffiliateLinks.length
    ? buildCentralMarketplaceOffers(review, centralAffiliateLinks)
    : buildMarketplaceOffers(review, productLinks);
  const reviewBySlug = new Map(allReviews.map((item) => [item.slug, item]));
  const relatedCommercial = relatedCommercialLinks
    .map((link) => ({
      link,
      review: link.review_slug ? reviewBySlug.get(link.review_slug) : undefined,
    }))
    .filter((item): item is { link: typeof relatedCommercialLinks[number]; review: Review } => Boolean(item.review))
    .sort(
      (a, b) =>
        (b.review.verdict_score || b.review.hero_overall_score || 0) -
        (a.review.verdict_score || a.review.hero_overall_score || 0) ||
        b.link.priority - a.link.priority
    )
    .slice(0, 3);
  const buyingGuide = buildBuyingGuideCategories(allReviews, 3).find(
    (item) => item.name === review.category
  );
  const buyingIntentPages = buildBuyingIntentPages(allReviews, 4).filter(
    (item) => item.categoryName === review.category
  );
  const relatedComparatives = allComparatives
    .filter(
      (article) =>
        normalizeCategoryName(article.category) === normalizeCategoryName(review.category)
    )
    .slice(0, 3);

  const related = allReviews
    .filter(
      (r) =>
        r.status === "published" &&
        r.category === review.category &&
        r.slug !== review.slug &&
        !isGuideLikeSlug(r.slug)
    )
    .sort(
      (a, b) =>
        reviewScore(b) - reviewScore(a) ||
        new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime() ||
        a.slug.localeCompare(b.slug)
    )
    .slice(0, 3);

  const heroBars = (Array.isArray(review.hero_bars) ? review.hero_bars : []).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const bar = raw as unknown as Record<string, unknown>;
    return [{ pct: toFiniteNumber(bar.pct), label: cleanEditorialText(bar.label), value: toFiniteNumber(bar.value) }];
  });
  const sections = normalizeReviewSections(review.sections);
  const specs = (Array.isArray(review.specs) ? review.specs : []).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const spec = raw as unknown as Record<string, unknown>;
    return [{ label: cleanEditorialText(spec.label), value: cleanEditorialText(spec.value), highlight: Boolean(spec.highlight) }];
  });
  const faq = (Array.isArray(review.faq) ? review.faq : []).flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as unknown as Record<string, unknown>;
    return [{ question: cleanEditorialText(item.question), answer: cleanEditorialText(item.answer) }];
  });
  const pros = (Array.isArray(review.pros) ? review.pros : []).map(cleanEditorialText).filter(Boolean);
  const cons = (Array.isArray(review.cons) ? review.cons : []).map(cleanEditorialText).filter(Boolean);
  const compareRows = normalizeCompareRows(review.compare_table?.rows);
  const compareColumns = normalizeCompareColumns(review.compare_table?.columns);
  const compareProductReviews = compareColumns.map((column, index) =>
    index === 0 ? null : findComparisonReview(String(column || ""), allReviews, review.slug)
  );
  const competitors = compareColumns.slice(1).filter((column) => normalizeComparableText(String(column || "")) !== normalizeComparableText(review.product)).slice(0, 3);

  const winCounts = new Map<number, number>();
  for (const row of compareRows) {
    if (Number.isInteger(row.winner) && row.winner >= 0 && row.winner < row.values.length) {
      winCounts.set(row.winner, (winCounts.get(row.winner) || 0) + 1);
    }
  }
  const bestCount = Math.max(0, ...winCounts.values());
  const computedWinnerIndex = bestCount > 0
    ? [...winCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1
    : -1;
  const explicitWinnerIndex = Number(review.compare_table?.winnerCol);
  const compareWinnerIndex = explicitWinnerIndex > 0 && explicitWinnerIndex < compareColumns.length
    ? explicitWinnerIndex
    : computedWinnerIndex >= 0
      ? computedWinnerIndex + 1
      : -1;
  const compareWinnerLabel = compareWinnerIndex > 0 ? compareColumns[compareWinnerIndex] || "" : "";
  const bestFor = pros.slice(0, 2);
  const notFor = cons.slice(0, 2);
  const decisionLabel = score >= 9.2 ? "Compra forte" : score >= 8.5 ? "Boa compra" : score >= 7 ? "Vale considerar" : "Compare antes de comprar";
  const categoryPrices = allReviews
    .filter((item) => item.status === "published" && item.category === review.category)
    .map((item) => parseReviewPrice(item.price_new))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const currentPrice = parseReviewPrice(review.price_new);
  const priceContext = currentPrice !== null && categoryPrices.length >= 4
    ? (() => {
        const mid = Math.floor(categoryPrices.length / 2);
        const median = categoryPrices.length % 2
          ? categoryPrices[mid]
          : (categoryPrices[mid - 1] + categoryPrices[mid]) / 2;
        const ratio = currentPrice / median;
        if (ratio <= 0.85) return "Faixa de preço abaixo da mediana da categoria.";
        if (ratio >= 1.15) return "Faixa de preço acima da mediana da categoria.";
        return "Faixa de preço próxima da mediana da categoria.";
      })()
    : "";
  const updatedLong = formatDateLong(review.updated_at);

  // Títulos sem duplicar "vale a pena?" quando o product já contém a pergunta.
  const asksWorth = /vale a pena/i.test(review.product);
  const isGuia = /guia/i.test(review.slug);
  const reviewTitle = isGuia
    ? `${review.product} — guia completo de compra`
    : asksWorth
      ? `${review.product} — Review completo, preço e alternativas`
      : `${review.product} vale a pena? Review completo, preço e alternativas`;
  const worthQuestion = isGuia
    ? `${review.product}: qual escolher?`
    : asksWorth
      ? review.product
      : `${review.product} vale a pena?`;
  const priceTitle = asksWorth
    ? `${review.product} — Preço e custo-benefício`
    : `${review.product} vale o preço?`;

  const toc = [
    { id: "resumo", label: "Resumo da análise" },
    ...(buyingOffers.length > 0 ? [{ id: "onde-comprar", label: "Onde comprar" }] : []),
    { id: "criterios", label: isGuia ? "O que analisamos neste guia" : "O que analisamos" },
    ...sections.map((s) => ({ id: s.id, label: s.tocLabel || s.heading })),
    ...(specs.length > 0 ? [{ id: "ficha-tecnica", label: "Ficha técnica" }] : []),
    ...(!isGuia ? [{ id: "preco", label: "Preço e custo-benefício" }] : []),
    ...(!isGuia && compareRows.length > 0 ? [{ id: "comparativo", label: "Comparativo com alternativas" }] : []),
    ...(!isGuia ? [{ id: "publico", label: "Para quem vale a pena" }] : []),
    ...(faq.length > 0 ? [{ id: "faq", label: "Perguntas frequentes" }] : []),
  ];

  return (
    <>
      {isGuia ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: review.product,
              description: review.hero_lead || review.meta_description,
              image: review.image_url || undefined,
              author: {
                "@type": "Person",
                name: primaryAuthor.name,
                url: `https://www.vetor.blog/author/${primaryAuthor.slug}/`,
              },
              publisher: {
                "@type": "Organization",
                name: "vetor.blog",
                url: "https://www.vetor.blog",
              },
              datePublished: review.created_at,
              dateModified: review.updated_at || review.created_at,
              mainEntityOfPage: {
                "@type": "WebPage",
                "@id": `https://www.vetor.blog/reviews/${review.slug}/`,
              },
              about: {
                "@type": "Thing",
                name: review.category,
              },
            }),
          }}
        />
      ) : (
        <ReviewSchema review={review} />
      )}
      {faq.length > 0 && <FAQSchema faqs={faq} />}
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.vetor.blog/" },
          { name: "Reviews", url: "https://www.vetor.blog/reviews/" },
          {
            name: review.category,
            url: `https://www.vetor.blog/reviews/categoria/${encodeURIComponent(review.category)}/`,
          },
          { name: review.product, url: `https://www.vetor.blog/reviews/${review.slug}/` },
        ]}
      />

      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews/" },
                {
                  label: review.category,
                  href: `/reviews/categoria/${encodeURIComponent(review.category)}/`,
                },
                { label: review.product },
              ]}
            />

            <div className="hero-grid">
              <div>
                <span className="eyebrow">Análise Vetor</span>
                <h1>{reviewTitle}</h1>
                <p className="hero-lead">
                  Analisamos os principais pontos de <strong>{review.product}</strong> para mostrar onde ele
                  se destaca, onde fica devendo e para quem a compra realmente faz sentido.
                </p>

                <div className="meta">
                  {updatedLong && (
                    <span>
                      Atualizado em <time dateTime={review.updated_at}>{updatedLong}</time>
                    </span>
                  )}
                  {updatedLong && <span>•</span>}
                  <span>Leitura: {readTime}</span>
                  <span>•</span>
                  <span>Equipe Vetor.blog</span>
                </div>

                <div className="disclosure">
                  <strong>Transparência:</strong> esta página pode conter links de afiliado. Se você comprar
                  por um desses links, o Vetor.blog pode receber uma comissão, sem custo adicional para você.
                  Isso não altera nossa análise editorial.
                </div>
              </div>

              <VerdictCard
                product={review.product}
                imageUrl={review.image_url}
                score={score}
                verdictTitle={verdictLabel}
                verdictText={verdictText}
                price={review.price_new}
                priceCheckedAt={review.updated_at}
                affiliateSlug={review.affiliate_url ? review.slug : undefined}
                decisionLabel={decisionLabel}
                bestFor={bestFor}
                notFor={notFor}
                priceContext={priceContext}
              />
            </div>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container layout">
            <article className="article">
              <AnswerBox
                product={review.product}
                question={worthQuestion}
                verdictLabel={verdictLabel}
                verdictText={verdictText}
                score={score}
                affiliateSlug={review.affiliate_url ? review.slug : undefined}
                price={review.price_new}
              />

              <section id="resumo">
                <h2>Resumo da análise</h2>
                <p>
                  <strong>{verdictLabel}</strong>. {verdictText}
                </p>

                <ProsCons pros={pros} cons={cons} />

                <div className="fact-grid">
                  <div className="fact">
                    <span>Categoria</span>
                    <strong>{review.category}</strong>
                  </div>
                  <div className="fact">
                    <span>Nota Vetor</span>
                    <strong>{br(score)}/10</strong>
                  </div>
                  {review.price_new && (
                    <div className="fact">
                      <span>Preço consultado</span>
                      <strong>{review.price_new}</strong>
                    </div>
                  )}
                </div>
              </section>

              {!isGuia && buyingOffers.length > 0 && (
                <BuyingEngine review={review} offers={buyingOffers} />
              )}

              {!isGuia && buyingIntentPages.length > 0 && (
                <ReviewPurchaseIntentLinks
                  categoryName={review.category}
                  pages={buyingIntentPages}
                  comparatives={relatedComparatives.map((article) => ({
                    slug: article.slug,
                    title: article.title,
                  }))}
                />
              )}

              {!isGuia && (
                <DecisionPath
                  product={review.product}
                  items={[
                    ...(relatedComparatives[0] ? [{
                      href: `/comparativos/${relatedComparatives[0].slug}/`,
                      label: "Comparar",
                      title: relatedComparatives[0].title,
                      description: "Coloque este produto lado a lado com uma alternativa relevante do mesmo cluster.",
                    }] : []),
                    ...(buyingIntentPages.find((item) => item.intent === "custo-beneficio") ? [{
                      href: `/melhores/${buyingIntentPages.find((item) => item.intent === "custo-beneficio")!.categorySlug}/custo-beneficio/`,
                      label: "Custo-benefício",
                      title: `Ver o melhor custo-benefício em ${review.category}`,
                      description: "Veja a seleção matemática do Vetor por nota e preço consultado.",
                    }] : []),
                    ...(relatedCommercial.length > 0 ? [{
                      href: "#alternativas",
                      label: "Alternativas",
                      title: "Ver alternativas com oferta",
                      description: "Compare outros produtos com review publicado e link comercial cadastrado.",
                    }] : []),
                  ]}
                />
              )}

              {!isGuia && !buyingIntentPages.length && buyingGuide && (
                <section className="buying-intent-section" aria-labelledby="review-cluster-heading">
                  <div className="section-kicker">Cluster Vetor</div>
                  <h2 id="review-cluster-heading">Explore mais sobre {review.category}</h2>
                  <p>
                    Este review faz parte do cluster de {review.category}. Consulte o hub da categoria ou o guia
                    de compra para comparar outras opções analisadas pelo Vetor.blog.
                  </p>
                  <div className="buying-intent-section-links">
                    <Link className="cta" href={`/reviews/categoria/${encodeURIComponent(review.category)}/`}>
                      Ver todos os reviews →
                    </Link>
                    <Link href={`/melhores/${buyingGuide.slug}/`}>
                      Ver guia de compra →
                    </Link>
                  </div>
                </section>
              )}

              {heroBars.length > 0 && (
                <section aria-labelledby="nota-criterios">
                  <h3 id="nota-criterios">Por que demos essa nota?</h3>
                  <p>Veja como a avaliação se distribui entre os principais critérios da categoria.</p>
                  <ScoreBarsStatic bars={heroBars} />
                </section>
              )}

              <AdPlacement
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP}
                className="ad-slot"
                ariaLabel="Publicidade"
              />

              <nav className="toc" aria-label="Índice do artigo">
                <strong>Neste review</strong>
                <ol>
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`}>{t.label}</a>
                    </li>
                  ))}
                </ol>
              </nav>

              <section id="criterios">
                <h2>{isGuia ? "O que analisamos neste guia" : "O que analisamos neste review"}</h2>
                <p>
                  Para chegar à avaliação, o Vetor.blog considera os pontos que mais influenciam a decisão de
                  compra dentro desta categoria:
                </p>
                <ul>
                  <li>
                    <strong>Qualidade e recursos:</strong> o que o produto realmente entrega.
                  </li>
                  <li>
                    <strong>Facilidade de uso:</strong> configuração, curva de aprendizado e experiência diária.
                  </li>
                  <li>
                    <strong>Desempenho:</strong> velocidade, estabilidade e consistência quando aplicável.
                  </li>
                  <li>
                    <strong>Preço:</strong> valor cobrado em relação ao que oferece.
                  </li>
                  <li>
                    <strong>Concorrência:</strong> comparação com alternativas relevantes.
                  </li>
                  <li>
                    <strong>Pós-compra:</strong> garantia, suporte e condições informadas pelo
                    vendedor/fabricante.
                  </li>
                </ul>

                <div className="callout">
                  <strong>Como avaliamos:</strong>
                  <p>
                    Seguimos a metodologia aberta do Vetor.blog, com critérios por categoria e checagem de
                    preços na data indicada. <Link href="/como-avaliamos/">Veja como avaliamos</Link>.
                  </p>
                </div>

                <EditorialEvidence updatedAt={review.updated_at} />
              </section>

              <div className="review-flow">
              <ReviewContent sections={sections} />

              {specs.length > 0 && (
                <section id="ficha-tecnica">
                  <h2>Ficha técnica</h2>
                  <SpecTable specs={specs} />
                </section>
              )}

              <AdPlacement
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE}
                className="ad-slot ad-slot--inline"
                ariaLabel="Publicidade"
              />

              {!isGuia && (
              <section id="preco">
                <h2>{priceTitle}</h2>
                {review.price_new ? (
                  <p>
                    No momento da análise, encontramos <strong>{review.product}</strong> por aproximadamente{" "}
                    <strong>{review.price_new}</strong>
                    {competitors.length > 0 && (
                      <>
                        . Nessa faixa, ele concorre diretamente com{" "}
                        {competitors.map((c, i) => (
                          <span key={c}>
                            {i > 0 && " e "}
                            <strong>{c}</strong>
                          </span>
                        ))}
                      </>
                    )}
                    .
                  </p>
                ) : (
                  <p>
                    O preço varia conforme loja, promoção e versão. Confira o valor atualizado antes de decidir
                    {competitors.length > 0 && (
                      <>
                        {" "}e compare com{" "}
                        {competitors.map((c, i) => (
                          <span key={c}>
                            {i > 0 && " e "}
                            <strong>{c}</strong>
                          </span>
                        ))}
                      </>
                    )}
                    .
                  </p>
                )}
                <p>
                  O custo-benefício fica mais interessante para quem valoriza o que o produto entrega de
                  melhor. Para outros perfis, uma alternativa mais barata ou mais completa pode ser uma compra
                  mais coerente.
                </p>

                {review.affiliate_url && (
                  <a
                    className="answer-next"
                    href="#onde-comprar"
                    data-aff-pos="preco"
                    style={{ maxWidth: 420, marginTop: 22 }}
                  >
                    Comparar ofertas e lojas →
                  </a>
                )}
              </section>
              )}

              {!isGuia && relatedCommercial.length > 0 && (
                <RelatedCommercialProducts items={relatedCommercial} />
              )}

              {!isGuia && compareRows.length > 0 && (
                <section id="comparativo">
                  <h2>{review.product} vs. concorrentes: qual a diferença?</h2>
                  <p>
                    A tabela abaixo ajuda a comparar os pontos que mais influenciam a decisão. Dados verificados
                    no momento da análise.
                  </p>

                  {compareWinnerLabel && (
                    <div className="compare-winner" role="status">
                      <span>Vetor escolhe</span>
                      <strong>{compareWinnerLabel}</strong>
                      {compareProductReviews[compareWinnerIndex] && (
                        <Link href={`/reviews/${compareProductReviews[compareWinnerIndex]!.slug}/`}>
                          Ler análise completa →
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="compare-wrap">
                    <table>
                      <thead>
                        <tr>
                          {compareColumns.map((col, i) => {
                            const label = col || (i === 0 ? "Critério" : "Opção " + i);
                            const linkedReview = compareProductReviews[i];
                            return (
                              <th key={i}>
                                {linkedReview ? (
                                  <Link href={"/reviews/" + linkedReview.slug + "/"}>{label}</Link>
                                ) : (
                                  label
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {compareRows.map((row, i) => (
                          <tr key={i}>
                            <td>
                              <strong>{row.feature}</strong>
                            </td>
                            {row.values.map((value, j) => {
                              const isWinner = row.winner === j;
                              return (
                                <td key={j} className={isWinner ? "win" : undefined}>
                                  {value}
                                  {isWinner ? " ✓" : ""}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {!isGuia && (
              <>
              <section id="publico">
                <h2>Para quem {worthQuestion}</h2>
                <div className="who-grid">
                  <div className="who-card">
                    <h3>Vale considerar se você...</h3>
                    <ul>
                      {(pros.length > 0 ? pros.slice(0, 4) : ["se identifica com o perfil descrito no resumo"]).map(
                        (pro, i) => (
                          <li key={i}>{pro}</li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="who-card">
                    <h3>Talvez não seja ideal se você...</h3>
                    <ul>
                      {(cons.length > 0 ? cons.slice(0, 3) : ["precisa de algo fora do perfil acima"]).map(
                        (con, i) => (
                          <li key={i}>{con}</li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </section>

              {faq.length > 0 && (
                <section id="faq">
                  <h2>Perguntas frequentes sobre {review.product}</h2>
                  <div className="faq">
                    {faq.map((item, i) => (
                      <details key={i}>
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2>Conclusão: {worthQuestion}</h2>
                <p>
                  <strong>{review.product}</strong> — <strong>{verdictLabel}</strong>: {verdictText}
                </p>
                <p>
                  Se esses pontos correspondem ao que você procura, vale conferir o preço atual e comparar com
                  as alternativas acima antes de decidir.
                </p>

                {review.affiliate_url && (
                  <a
                    className="answer-next"
                    href="#onde-comprar"
                    data-aff-pos="conclusao"
                    style={{ maxWidth: 440, marginTop: 22 }}
                  >
                    Voltar às ofertas e comparar antes de comprar →
                  </a>
                )}
              </section>

              <AuthorBox
                name={primaryAuthor.name}
                bio={primaryAuthor.bio}
                slug={primaryAuthor.slug}
                role={primaryAuthor.role}
                avatar={primaryAuthor.avatar}
                date={review.updated_at}
                readTime={`Leitura: ${readTime}`}
              />

              {relatedComparatives.length > 0 && (
                <section>
                  <h2>Compare produtos desta categoria</h2>
                  <p>
                    Veja comparativos do mesmo cluster para colocar opções lado a lado e entender
                    qual faz mais sentido para seu orçamento e uso.
                  </p>
                  <div className="related">
                    {relatedComparatives.map((article) => (
                      <Link key={article.slug} href={`/comparativos/${article.slug}/`}>
                        <small>Comparativo</small>
                        <strong>{article.title}</strong>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {related.length > 0 && (
                <section>
                  <h2>Leia também</h2>
                  <div className="related">
                    {related.map((r) => (
                      <Link key={r.slug} href={`/reviews/${r.slug}/`}>
                        <small>Review</small>
                        <strong>{r.meta_title || `${r.product} vale a pena?`}</strong>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              </>
              )}
              </div>
            </article>

            <aside className="sidebar" aria-label="Conteúdo complementar">
              <div className="side-card buy-card">
                <h3>{review.product} em resumo</h3>
                <div className="price-line">
                  <span>Nota Vetor</span>
                  <strong>{br(score)}/10</strong>
                </div>
                {review.price_new && (
                  <div className="price-line">
                    <span>Preço consultado</span>
                    <strong>{review.price_new}</strong>
                  </div>
                )}
                <p className="buy-card-summary">{verdictText}</p>
                {review.updated_at && (
                  <p className="buy-card-meta">
                    Valor verificado em {formatDateLong(review.updated_at)}. O preço pode mudar.
                  </p>
                )}
                {review.affiliate_url && (
                  <a
                    className="cta"
                    href={`/go/${review.slug}/`}
                    data-aff-pos="sidebar"
                    target="_blank"
                    rel="sponsored nofollow noopener"
                  >
                    Ver preço e disponibilidade
                  </a>
                )}
              </div>

              <div className="side-card">
                <h3>Sobre esta análise</h3>
                <p>O Vetor.blog publica reviews e comparativos com foco em clareza, utilidade e decisão de compra.</p>
                <div className="side-links">
                  <Link href="/como-avaliamos/">Como avaliamos</Link>
                  <Link href="/politica-editorial/">Política editorial</Link>
                  <Link href="/afiliados/">Política de afiliados</Link>
                </div>
              </div>

              <AdPlacement
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR}
                className="ad-slot"
                style={{ minHeight: 280, margin: 0 }}
                ariaLabel="Publicidade"
              />
            </aside>
          </div>
        </section>
      </main>

      {review.affiliate_url && <StickyBuyBar affiliateSlug={review.slug} price={review.price_new} />}
    </>
  );
}
