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
  return value === 'baratos' || value === 'custo-beneficio';
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

  const title = page.intent === 'baratos'
    ? 'Melhores ' + page.categoryName + ' baratos em 2026'
    : 'Melhores ' + page.categoryName + ' custo-benefício em 2026';
  const description = page.intent === 'baratos'
    ? 'Compare os ' + page.categoryName.toLowerCase() + ' com menor preço consultado no Vetor e veja nota, limitações e links para as análises.'
    : 'Compare o custo-benefício de ' + page.categoryName.toLowerCase() + ' analisados pelo Vetor usando uma fórmula transparente de nota e preço.';

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

            <div className="buying-choice-grid">
              {page.reviews.map((review, index) => (
                <BuyingChoiceCard key={review.slug} review={review} rank={index + 1} />
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
              <Link href="/melhores/">Todos os guias →</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}