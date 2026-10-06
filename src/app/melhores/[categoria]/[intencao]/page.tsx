import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import { BreadcrumbSchema, ItemListSchema } from '@/components/SchemaMarkup';
import BuyingChoiceCard from '@/components/BuyingChoiceCard';
import EditorialEvidence from '@/components/EditorialEvidence';
import { fetchAllReviews } from '@/lib/data';
import {
  buildBuyingIntentPages,
  getBuyingIntentDescription,
  getBuyingIntentLabel,
  reviewScore,
  type BuyingIntent,
} from '@/lib/buying';

interface PageProps {
  params: Promise<{ categoria: string; intencao: string }>;
}

function isBuyingIntent(value: string): value is BuyingIntent {
  return (
    ['baratos', 'custo-beneficio', 'para-trabalho', 'para-estudo', 'para-jogos', 'premium'] as const
  ).includes(value as BuyingIntent);
}

export async function generateStaticParams() {
  const reviews = await fetchAllReviews();
  return buildBuyingIntentPages(reviews, 4).map((item) => ({
    categoria: item.categorySlug,
    intencao: item.intent,
  }));
}

async function resolvePage(categoria: string, intencao: string) {
  if (!isBuyingIntent(intencao)) return null;
  const reviews = await fetchAllReviews();
  return buildBuyingIntentPages(reviews, 4).find(
    (item) => item.categorySlug === categoria && item.intent === intencao
  ) || null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { categoria, intencao } = await params;
  const page = await resolvePage(categoria, intencao);
  if (!page) return { title: 'Seleção de compra não encontrada' };

  const label = getBuyingIntentLabel(page.intent);
  const title = 'Melhores ' + page.categoryName + ' ' + label.toLowerCase() + ' em 2026';
  const description =
    getBuyingIntentDescription(page.intent, page.categoryName) +
    ' Veja notas, preços consultados e links para as análises.';

  return {
    title,
    description,
    alternates: { canonical: '/melhores/' + page.categorySlug + '/' + page.intent + '/' },
    openGraph: {
      title,
      description,
      url: 'https://www.vetor.blog/melhores/' + page.categorySlug + '/' + page.intent + '/',
      type: 'article',
    },
    robots: { index: true, follow: true },
  };
}

export default async function BuyingIntentPage({ params }: PageProps) {
  const { categoria, intencao } = await params;
  const reviews = await fetchAllReviews();
  const page = isBuyingIntent(intencao)
    ? buildBuyingIntentPages(reviews, 4).find(
        (item) => item.categorySlug === categoria && item.intent === intencao
      ) || null
    : null;

  if (!page) notFound();

  const label = getBuyingIntentLabel(page.intent);
  const guideHref = '/melhores/' + page.categorySlug + '/';
  const categoryHref = '/reviews/categoria/' + encodeURIComponent(page.categoryName) + '/';
  const siblingIntent = buildBuyingIntentPages(reviews, 4).find(
    (item) => item.categorySlug === page.categorySlug && item.intent !== page.intent
  );
  const latestUpdated = page.reviews.reduce((latest, review) => {
    const current = new Date(review.updated_at || review.created_at).getTime();
    const previous = latest ? new Date(latest).getTime() : 0;
    return current > previous ? (review.updated_at || review.created_at) : latest;
  }, '' as string);
  const averageScore = page.reviews.reduce((sum, review) => sum + reviewScore(review), 0) / page.reviews.length;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Início', url: 'https://www.vetor.blog/' },
          { name: 'Melhores produtos', url: 'https://www.vetor.blog/melhores/' },
          { name: page.categoryName, url: 'https://www.vetor.blog/melhores/' + page.categorySlug + '/' },
          { name: label, url: 'https://www.vetor.blog/melhores/' + page.categorySlug + '/' + page.intent + '/' },
        ]}
      />
      <ItemListSchema
        items={page.reviews.map((review) => ({
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
                { label: page.categoryName, href: guideHref },
                { label },
              ]}
            />
            <span className="eyebrow">{label}</span>
            <h1>
              {page.intent === 'baratos'
                ? 'Melhores ' + page.categoryName + ' baratos em 2026'
                : 'Melhores ' + page.categoryName + ' custo-benefício em 2026'}
            </h1>
            <p className="hero-lead">
              {page.intent === 'baratos'
                ? 'Seleção pelas menores faixas de preço consultadas entre as análises disponíveis, mantendo a nota e a página completa de cada produto para você conferir.'
                : 'Seleção calculada a partir da relação entre nota Vetor e preço consultado, com fórmula explícita para você entender como a lista foi ordenada.'}
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="buying-intent-page-intro">
              <div>
                <span className="eyebrow-small">Como esta página é ordenada</span>
                <h2>{label}: critério explícito e preços datados</h2>
                <p>{getBuyingIntentDescription(page.intent, page.categoryName)}</p>
                <div className="buying-intent-stat">
                  <span>{page.count} opções comparáveis</span>
                  <span>Nota média: {averageScore.toFixed(1).replace('.', ',')}/10</span>
                  {latestUpdated && (
                    <span>
                      Atualização mais recente: {new Date(latestUpdated).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="buying-intent-page-actions">
                <Link className="cta" href={guideHref}>Ver guia completo →</Link>
                <Link href={categoryHref}>Ver todos os reviews →</Link>
              </div>
            </div>

            {siblingIntent && (
              <section className="buying-intent-section" aria-labelledby="outra-intencao-heading">
                <div className="section-kicker">Outra forma de comparar</div>
                <h2 id="outra-intencao-heading">Também veja esta categoria por outra intenção</h2>
                <p>
                  Se o critério desta página não for o que você procura, compare os mesmos produtos usando
                  {` ${getBuyingIntentLabel(siblingIntent.intent).toLowerCase()}`}.
                </p>
                <Link
                  className="buying-intent-card"
                  href={'/melhores/' + siblingIntent.categorySlug + '/' + siblingIntent.intent + '/'}
                >
                  <span>{getBuyingIntentLabel(siblingIntent.intent)}</span>
                  <strong>{getBuyingIntentLabel(siblingIntent.intent)} em {page.categoryName}</strong>
                  <small>{getBuyingIntentDescription(siblingIntent.intent, page.categoryName)}</small>
                  <b>Ver seleção →</b>
                </Link>
              </section>
            )}

            <div className="buying-choice-grid">
              {page.reviews.map((review, index) => (
                <BuyingChoiceCard key={review.slug} review={review} rank={index + 1} intent={page.intent} />
              ))}
            </div>

            <section className="buying-category-table-section" aria-labelledby="intent-table-heading">
              <div className="section-kicker">Comparação</div>
              <h2 id="intent-table-heading">Preço e nota das opções</h2>
              <div className="compare-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Produto</th>
                      <th>Nota Vetor</th>
                      <th>Preço consultado</th>
                      <th>Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.reviews.map((review, index) => (
                      <tr key={review.slug}>
                        <td>{index + 1}</td>
                        <td><strong>{review.product}</strong></td>
                        <td>{String(reviewScore(review)).replace('.', ',')}/10</td>
                        <td>{review.price_new}</td>
                        <td><Link href={'/reviews/' + review.slug + '/'}>Ler review →</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <EditorialEvidence />

            <div className="buying-guide-footer-links">
              <Link href={guideHref}>← Guia de {page.categoryName}</Link>
              {siblingIntent && (
                <Link href={'/melhores/' + siblingIntent.categorySlug + '/' + siblingIntent.intent + '/'}>
                  {getBuyingIntentLabel(siblingIntent.intent)} →
                </Link>
              )}
              <Link href="/melhores/">Todos os guias →</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}