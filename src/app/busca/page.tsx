import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import SiteSearch from '@/components/SiteSearch';
import { ItemListSchema, BreadcrumbSchema } from '@/components/SchemaMarkup';
import { fetchAllReviews, fetchAllViralArticles, fetchGuias } from '@/lib/data';
import { isGuideLikeSlug, reviewScore } from '@/lib/buying';
import type { Review, ViralArticle } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Buscar no Vetor.blog',
  description: 'Pesquise reviews, comparativos e guias de compra no Vetor.blog.',
  alternates: { canonical: '/busca/' },
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesReview(review: Review, query: string): boolean {
  const haystack = normalize([
    review.product,
    review.category,
    review.meta_title,
    review.meta_description,
    review.hero_lead,
    ...(review.sections ?? []).map((section) => section.heading),
  ].join(' '));
  return haystack.includes(query);
}

function matchesArticle(article: ViralArticle, query: string): boolean {
  return normalize([article.title, article.description, article.category, article.content].join(' ')).includes(query);
}

function scoreLabel(review: Review): string {
  const score = reviewScore(review);
  return score > 0 ? `Nota ${String(score).replace('.', ',')}/10` : 'Review completo';
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q = '' } = await searchParams;
  const query = normalize(q).slice(0, 100);
  const [reviews, articles, guides] = await Promise.all([
    fetchAllReviews(),
    fetchAllViralArticles(),
    fetchGuias(),
  ]);

  const publishedReviews = reviews.filter((review) => review.status === 'published');
  const reviewResults = query
    ? publishedReviews
        .filter((review) => !isGuideLikeSlug(review.slug) && matchesReview(review, query))
        .slice(0, 18)
    : [];
  const guideResults = query
    ? guides.filter((guide) => guide.status === 'published' && isGuideLikeSlug(guide.slug) && matchesReview(guide, query)).slice(0, 8)
    : [];
  const articleResults = query
    ? articles.filter((article) => matchesArticle(article, query)).slice(0, 8)
    : [];

  const resultItems = [
    ...reviewResults.map((review) => ({
      name: review.product,
      url: `https://www.vetor.blog/reviews/${review.slug}/`,
    })),
    ...guideResults.map((guide) => ({
      name: guide.product,
      url: `https://www.vetor.blog/reviews/${guide.slug}/`,
    })),
    ...articleResults.map((article) => ({
      name: article.title,
      url: `https://www.vetor.blog/comparativos/${article.slug}/`,
    })),
  ];

  const categories = Array.from(
    new Set(publishedReviews.map((review) => review.category))
  ).slice(0, 12);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Início', url: 'https://www.vetor.blog/' },
          { name: 'Buscar', url: 'https://www.vetor.blog/busca/' },
        ]}
      />
      {resultItems.length > 0 && <ItemListSchema items={resultItems} />}

      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs items={[{ label: 'Início', href: '/' }, { label: 'Buscar' }]} />
            <span className="eyebrow">Busca Vetor</span>
            <h1>{q.trim() ? `Resultados para “${q.trim().slice(0, 80)}”` : 'O que você quer descobrir?'}</h1>
            <p className="hero-lead">
              Encontre reviews, comparativos e guias por produto, categoria ou assunto.
            </p>
            <div style={{ marginTop: 24, maxWidth: 720 }}>
              <SiteSearch compact initialValue={q.trim().slice(0, 100)} />
            </div>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            {!query ? (
              <div className="article">
                <h2>Comece por uma categoria</h2>
                <p>
                  Pesquise pelo nome do produto ou use uma categoria para encontrar análises relacionadas.
                </p>
                <div className="home-category-grid">
                  {categories.map((category) => (
                    <Link
                      key={category}
                      className="home-category"
                      href={`/busca/?q=${encodeURIComponent(category)}`}
                    >
                      <span>{category}</span>
                      <strong>Reviews e conteúdos relacionados</strong>
                      <b>Pesquisar →</b>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {reviewResults.length === 0 && articleResults.length === 0 && guideResults.length === 0 ? (
                  <div className="article">
                    <h2>Nenhum resultado encontrado</h2>
                    <p>
                      Tente outro termo, o nome de uma categoria ou uma pergunta mais curta.
                    </p>
                    <Link className="cta" href="/melhores/" style={{ maxWidth: 360, marginTop: 20 }}>
                      Ver guias de compra
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 46 }}>
                    {reviewResults.length > 0 && (
                      <section aria-labelledby="reviews-resultados">
                        <span className="eyebrow-small">Reviews</span>
                        <h2 id="reviews-resultados">Análises encontradas</h2>
                        <div className="home-card-grid">
                          {reviewResults.map((review) => (
                            <Link key={review.slug} className="home-card" href={`/reviews/${review.slug}/`}>
                              <span className="home-card-label">{review.category}</span>
                              <h3>{review.product}</h3>
                              <p>{review.hero_lead || review.meta_description}</p>
                              <div className="home-card-bottom">{scoreLabel(review)} · Ler review →</div>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}

                    {articleResults.length > 0 && (
                      <section aria-labelledby="comparativos-resultados">
                        <span className="eyebrow-small">Comparativos</span>
                        <h2 id="comparativos-resultados">Comparativos encontrados</h2>
                        <div className="home-compare-grid">
                          {articleResults.map((article) => (
                            <Link key={article.slug} className="home-compare" href={`/comparativos/${article.slug}/`}>
                              <div>
                                <span className="tag">{article.category}</span>
                                <h3>{article.title}</h3>
                                <p>{article.description}</p>
                              </div>
                              <span className="home-arrow">→</span>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}

                    {guideResults.length > 0 && (
                      <section aria-labelledby="guias-resultados">
                        <span className="eyebrow-small">Guias</span>
                        <h2 id="guias-resultados">Guias encontrados</h2>
                        <div className="home-card-grid">
                          {guideResults.map((guide) => (
                            <Link key={guide.slug} className="home-card" href={`/reviews/${guide.slug}/`}>
                              <span className="home-card-label">{guide.category}</span>
                              <h3>{guide.product}</h3>
                              <p>{guide.hero_lead || guide.meta_description}</p>
                              <div className="home-card-bottom">Ler guia →</div>
                            </Link>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
