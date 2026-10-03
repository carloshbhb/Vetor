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
import { fetchReviewBySlug, fetchAllReviews } from "@/lib/data";
import { resolveOgImage } from "@/lib/seo";
import type { Review } from "@/lib/types";
import AuthorBox from "@/components/AuthorBox";
import { primaryAuthor } from "@/data/authors";

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
  const ogImage = resolveOgImage(review.meta_og_image || review.image_url);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
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

const br = (n: number) => String(n).replace(".", ",");

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
  const verdictText = review.verdict_text || generateVerdictText(review);
  const totalContentLength =
    review.sections?.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 500;
  const readTime = review.meta_reading_time
    ? `${review.meta_reading_time} min`
    : `${Math.max(3, Math.ceil(totalContentLength / 1000))} min`;

  const allReviews = await fetchAllReviews();
  const related = allReviews
    .filter((r) => r.category === review.category && r.slug !== review.slug)
    .slice(0, 3);

  const heroBars = Array.isArray(review.hero_bars) ? review.hero_bars : [];
  const sections = Array.isArray(review.sections) ? review.sections : [];
  const specs = Array.isArray(review.specs) ? review.specs : [];
  const faq = Array.isArray(review.faq) ? review.faq : [];
  const pros = Array.isArray(review.pros) ? review.pros : [];
  const cons = Array.isArray(review.cons) ? review.cons : [];
  const compareRows = review.compare_table?.rows ?? [];
  const compareColumns = review.compare_table?.columns ?? [];
  const competitors = compareColumns.filter(Boolean).slice(1, 3);
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
      <ReviewSchema review={review} />
      {faq.length > 0 && <FAQSchema faqs={faq} />}
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.vetor.blog/" },
          { name: "Reviews", url: "https://www.vetor.blog/reviews" },
          { name: review.product, url: `https://www.vetor.blog/reviews/${review.slug}` },
        ]}
      />

      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Reviews", href: "/reviews/" },
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
              </section>

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
                    className="cta"
                    href={`/go/${review.slug}/`}
                    data-aff-pos="preco"
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    style={{ maxWidth: 420, marginTop: 22 }}
                  >
                    Conferir preço atualizado
                  </a>
                )}
              </section>
              )}

              {!isGuia && compareRows.length > 0 && (
                <section id="comparativo">
                  <h2>{review.product} vs. concorrentes: qual a diferença?</h2>
                  <p>
                    A tabela abaixo ajuda a comparar os pontos que mais influenciam a decisão. Dados verificados
                    no momento da análise.
                  </p>

                  <div className="compare-wrap">
                    <table>
                      <thead>
                        <tr>
                          {compareColumns.map((col, i) => (
                            <th key={i}>{col || (i === 0 ? "Critério" : `Opção ${i}`)}</th>
                          ))}
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
                    className="cta"
                    href={`/go/${review.slug}/`}
                    data-aff-pos="conclusao"
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    style={{ maxWidth: 440, marginTop: 22 }}
                  >
                    Ver oferta e disponibilidade
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
