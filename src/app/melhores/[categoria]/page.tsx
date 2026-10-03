import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ItemListSchema } from '@/components/SchemaMarkup';
import BuyingChoiceCard from '@/components/BuyingChoiceCard';
import EditorialEvidence from '@/components/EditorialEvidence';
import { fetchAllReviews } from '@/lib/data';
import { buildBuyingGuideCategories, rankBuyingReviews, reviewScore } from '@/lib/buying';

interface PageProps {
  params: Promise<{ categoria: string }>;
}

async function getCategory(slug: string) {
  const reviews = await fetchAllReviews();
  return buildBuyingGuideCategories(reviews, 3).find((category) => category.slug === slug) || null;
}

export async function generateStaticParams() {
  const reviews = await fetchAllReviews();
  return buildBuyingGuideCategories(reviews, 3).map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categoria } = await params;
  const category = await getCategory(categoria);
  if (!category) return { title: 'Guia de compra não encontrado' };

  const title = 'Melhores ' + category.name + ' em 2026: quais comprar';
  const description =
    'Compare os principais ' +
    category.name.toLowerCase() +
    ' analisados pelo Vetor, com notas, preços consultados, alternativas e links para compra';

  return {
    title,
    description,
    alternates: { canonical: '/melhores/' + category.slug + '/' },
    openGraph: {
      title,
      description,
      url: 'https://www.vetor.blog/melhores/' + category.slug + '/',
      type: 'article',
    },
  };
}

export default async function BestCategoryPage({ params }: PageProps) {
  const { categoria } = await params;
  const reviews = await fetchAllReviews();
  const category = buildBuyingGuideCategories(reviews, 3).find((item) => item.slug === categoria);

  if (!category) notFound();

  const ranked = rankBuyingReviews(
    reviews.filter((review) => review.category === category.name)
  ).slice(0, 10);

  if (ranked.length < 3) notFound();

  return (
    <>
      <ItemListSchema
        items={ranked.map((review) => ({
          name: review.product,
          url: '/reviews/' + review.slug + '/',
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: 'Início', href: '/' },
                { label: 'Melhores produtos', href: '/melhores/' },
                { label: category.name },
              ]}
            />
            <span className="eyebrow">Guia de compra</span>
            <h1>Melhores {category.name} em 2026</h1>
            <p className="hero-lead">
              Compare {ranked.length} opções analisadas pelo Vetor, veja as notas disponíveis e abra cada review antes de comprar.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="buying-guide-intro buying-guide-intro--category">
              <div>
                <span className="eyebrow-small">Critério desta lista</span>
                <h2>A ordem começa pela nota editorial</h2>
                <p>
                  A seleção é montada a partir das análises publicadas nesta categoria e ordenada pela nota Vetor disponível. Preço, recursos, limitações e adequação ao seu perfil precisam ser conferidos no review individual.
                </p>
              </div>
              <div className="buying-guide-intro-actions">
                <Link
                  className="cta"
                  href={'/reviews/categoria/' + encodeURIComponent(category.name) + '/'}
                >
                  Ver todos os reviews →
                </Link>
                <Link href="/comparativos/">Ver comparativos →</Link>
              </div>
            </div>

            <div className="buying-choice-grid">
              {ranked.map((review, index) => (
                <BuyingChoiceCard key={review.slug} review={review} rank={index + 1} />
              ))}
            </div>

            <section
              className="buying-category-table-section"
              aria-labelledby="comparacao-rapida-heading"
            >
              <div className="section-kicker">Comparação rápida</div>
              <h2 id="comparacao-rapida-heading">Notas e preços consultados</h2>
              <div className="compare-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Nota</th>
                      <th>Preço consultado</th>
                      <th>Análise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((review) => (
                      <tr key={review.slug}>
                        <td><strong>{review.product}</strong></td>
                        <td>{String(reviewScore(review)).replace('.', ',')}/10</td>
                        <td>{review.price_new || 'Confira na oferta'}</td>
                        <td><Link href={'/reviews/' + review.slug + '/'}>Ler review →</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <EditorialEvidence />

            <div className="buying-guide-footer-links">
              <Link href="/melhores/">← Todos os guias</Link>
              <Link href="/ofertas/">Ofertas do Vetor →</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
