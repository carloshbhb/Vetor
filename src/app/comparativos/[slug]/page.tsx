import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import AuthorBox from "@/components/AuthorBox";
import VsCards, { type VsProduct } from "@/components/VsCards";
import AdPlacement from "@/components/AdPlacement";
import { BreadcrumbSchema } from "@/components/SchemaMarkup";
import { fetchViralArticleBySlug, fetchAllViralArticles, fetchReviewBySlug } from "@/lib/data";
import { sanitizeHtml } from "@/lib/sanitize";
import { generateViralArticleSchema } from "@/lib/seo";
import { primaryAuthor } from "@/data/authors";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await fetchAllViralArticles();
  return articles.map((article) => ({ slug: article.slug }));
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

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

const br = (n: number) => String(n).replace(".", ",");

export default async function ViralArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = await fetchViralArticleBySlug(slug);

  if (!article) notFound();

  const related = await fetchAllViralArticles();
  const relatedFiltered = related.filter((a) => a.slug !== article.slug).slice(0, 2);

  // Enriquece produtos com reviews existentes (preço, nota) — sem dado, sem bloco.
  const products = article.products ?? [];
  const enriched = await Promise.all(
    products.map(async (p) => ({
      product: p,
      review: p.slug ? await fetchReviewBySlug(p.slug) : null,
    }))
  );
  const reviewed = enriched.filter((e) => e.review);
  const bestScore = Math.max(0, ...reviewed.map((e) => e.review?.verdict_score ?? 0));

  const vsProducts: VsProduct[] = enriched.map(({ product: p, review }, i) => {
    const score = review?.verdict_score ?? 0;
    if (p.product_url) {
      return {
        name: p.name,
        imageUrl: p.imageUrl,
        eyebrow: article.category,
        summary:
          review && score > 0
            ? `Nota ${br(score)}/10 · ${review.category}`
            : article.category,
        ctaHref: `/go/${article.slug}-p${i + 1}/`,
        ctaLabel: "Ver preço",
        ctaPos: i === 0 ? "hero-a" : "hero-b",
        external: true,
        fetchPriority: i === 0,
      };
    }
    if (review) {
      return {
        name: p.name,
        imageUrl: p.imageUrl,
        eyebrow: article.category,
        summary: `Nota ${br(score)}/10 · Leia a análise completa.`,
        ctaHref: `/reviews/${review.slug}/`,
        ctaLabel: "Ler review",
        fetchPriority: i === 0,
      };
    }
    return {
      name: p.name,
      imageUrl: p.imageUrl,
      eyebrow: article.category,
      summary: article.category,
      fetchPriority: i === 0,
    };
  });

  const tableRows: Array<{ label: string; values: string[]; winIdx: number }> =
    reviewed.length > 0
      ? [
          {
            label: "Preço",
            values: reviewed.map((e) => e.review?.price_new || "—"),
            winIdx: -1,
          },
          {
            label: "Nota Vetor",
            values: reviewed.map((e) =>
              (e.review?.verdict_score ?? 0) > 0 ? br(e.review!.verdict_score) : "—"
            ),
            winIdx: reviewed.findIndex((e) => (e.review?.verdict_score ?? 0) === bestScore),
          },
        ]
      : [];

  const updatedLong = formatDateLong(article.updated_at || article.published_at);
  const articleSchema = generateViralArticleSchema(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BreadcrumbSchema
        items={[
          { name: "Início", url: "https://www.vetor.blog/" },
          { name: "Comparativos", url: "https://www.vetor.blog/comparativos" },
          { name: article.title, url: `https://www.vetor.blog/comparativos/${article.slug}` },
        ]}
      />

      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: "Início", href: "/" },
                { label: "Comparativos", href: "/comparativos/" },
                { label: article.title },
              ]}
            />
            <span className="eyebrow">Comparativo Vetor</span>
            <h1>{article.title}</h1>
            <p className="hero-lead">{article.description}</p>
            <div className="meta">
              {updatedLong && (
                <span>
                  Atualizado em <time dateTime={article.updated_at}>{updatedLong}</time>
                </span>
              )}
            </div>
            <div className="disclosure">
              <strong>Transparência:</strong> esta página pode conter links de afiliado. Se você comprar por
              eles, o Vetor.blog pode receber comissão, sem custo extra para você. Isso não altera a análise.{" "}
              <Link href="/afiliados/">Saiba mais</Link>.
            </div>
            <VsCards products={vsProducts} />
          </div>
        </section>

        <div className="container">
          <AdPlacement
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOP}
            className="ad-slot ad-slot--inline"
            ariaLabel="Publicidade"
          />
        </div>

        <section className="content-wrap">
          <div className="container layout">
            <article className="article">
              <nav className="toc" aria-label="Índice">
                <strong>Neste artigo</strong>
                <ol>
                  <li>
                    <a href="#resposta">Resposta rápida</a>
                  </li>
                  {tableRows.length > 0 && (
                    <li>
                      <a href="#tabela">Comparação lado a lado</a>
                    </li>
                  )}
                  <li>
                    <a href="#detalhes">Diferenças que importam</a>
                  </li>
                  <li>
                    <a href="#escolha">Qual escolher</a>
                  </li>
                </ol>
              </nav>

              <div className="answer" id="resposta">
                <h2>Resposta rápida</h2>
                <p>{article.description}</p>
                {reviewed.length > 0 && (
                  <p>
                    {reviewed.map((e) => (
                      <span key={e.review!.slug}>
                        <Link href={`/reviews/${e.review!.slug}/`}>Review do {e.product.name}</Link>
                        {" · "}
                      </span>
                    ))}
                    Leia cada análise completa antes de decidir.
                  </p>
                )}
              </div>

              {tableRows.length > 0 && (
                <section id="tabela">
                  <h2>Comparação lado a lado</h2>
                  <div className="compare-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Critério</th>
                          {reviewed.map((e) => (
                            <th key={e.product.name}>{e.product.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((row) => (
                          <tr key={row.label}>
                            <td>
                              <strong>{row.label}</strong>
                            </td>
                            {row.values.map((value, j) => {
                              const isWinner = row.winIdx === j;
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

              <AdPlacement
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_INLINE}
                className="ad-slot ad-slot--inline"
                ariaLabel="Publicidade"
              />

              <section id="detalhes">
                <h2>As diferenças que realmente importam</h2>
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }} />
              </section>

              <section id="escolha">
                <h2>Qual escolher?</h2>
                <div className="who-grid">
                  {enriched.map(({ product: p, review }, i) => (
                    <div className="who-card" key={p.name}>
                      <h3>{p.name}</h3>
                      <ul>
                        {review && (review.verdict_score ?? 0) > 0 && (
                          <li>Nota Vetor: {br(review.verdict_score)}/10</li>
                        )}
                        {review?.price_new && <li>Preço consultado: {review.price_new}</li>}
                        <li>Categoria: {article.category}</li>
                      </ul>
                      {p.product_url ? (
                        <a
                          className="cta"
                          href={`/go/${article.slug}-p${i + 1}/`}
                          data-aff-pos={i === 0 ? "escolha-a" : "escolha-b"}
                          target="_blank"
                          rel="sponsored nofollow noopener"
                        >
                          Ver preço
                        </a>
                      ) : (
                        review && (
                          <Link className="cta" href={`/reviews/${review.slug}/`}>
                            Ler review
                          </Link>
                        )
                      )}
                    </div>
                  ))}
                </div>
                {reviewed.length > 0 && (
                  <p>
                    Quer ver cada um em detalhe? Leia{" "}
                    {reviewed.map((e, i) => (
                      <span key={e.review!.slug}>
                        {i > 0 && " e "}
                        <Link href={`/reviews/${e.review!.slug}/`}>o review do {e.product.name}</Link>
                      </span>
                    ))}
                    .
                  </p>
                )}
              </section>

              <AuthorBox
                name={primaryAuthor.name}
                bio={primaryAuthor.bio}
                slug={primaryAuthor.slug}
                role={primaryAuthor.role}
                date={article.updated_at}
              />

              {relatedFiltered.length > 0 && (
                <section>
                  <h2>Compare também</h2>
                  <div className="related">
                    {relatedFiltered.map((a) => (
                      <Link key={a.slug} href={`/comparativos/${a.slug}/`}>
                        <small>Comparativo</small>
                        <strong>{a.title}</strong>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </article>

            <aside className="sidebar" aria-label="Complementar">
              <div className="side-card">
                <h3>Como avaliamos</h3>
                <p>Critérios, fontes de preço e política editorial abertos para você conferir.</p>
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
    </>
  );
}
