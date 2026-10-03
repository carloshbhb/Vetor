import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { ItemListSchema } from '@/components/SchemaMarkup';
import { fetchAllReviews } from '@/lib/data';
import { buildBuyingGuideCategories } from '@/lib/buying';

export const metadata: Metadata = {
  title: 'Melhores Produtos em 2026 — Guias de Compra',
  description:
    'Guias de compra do Vetor com produtos selecionados por categoria, notas editoriais, preços consultados e links para as lojas disponíveis.',
  alternates: { canonical: '/melhores/' },
};

export default async function BestProductsPage() {
  const reviews = await fetchAllReviews();
  const categories = buildBuyingGuideCategories(reviews, 3);

  return (
    <>
      <ItemListSchema
        items={categories.map((category) => ({
          name: 'Melhores ' + category.name,
          url: '/melhores/' + category.slug + '/',
        }))}
      />
      <main id="conteudo">
        <section className="hero">
          <div className="container">
            <Breadcrumbs
              items={[
                { label: 'Início', href: '/' },
                { label: 'Melhores produtos' },
              ]}
            />
            <span className="eyebrow">Guias de compra</span>
            <h1>Melhores produtos em 2026</h1>
            <p className="hero-lead">
              Seleções por categoria para comparar opções, nota editorial, preço consultado e onde comprar.
            </p>
          </div>
        </section>

        <section className="content-wrap">
          <div className="container">
            <div className="buying-guide-intro">
              <div>
                <span className="eyebrow-small">Como usar</span>
                <h2>Comece pela intenção de compra</h2>
                <p>
                  Cada guia reúne produtos que já possuem análise individual no Vetor. A ordem usa a nota editorial disponível; depois de escolher um modelo, abra a análise completa para conferir limitações, comparação e preço.
                </p>
              </div>
              <Link className="cta" href="/como-avaliamos/">Conhecer critérios →</Link>
            </div>

            <div className="buying-guide-grid">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={'/melhores/' + category.slug + '/'}
                  className="buying-guide-card"
                >
                  <div className="buying-guide-card-head">
                    <span>{category.count} análises</span>
                    <strong>›</strong>
                  </div>
                  <h2>Melhores {category.name}</h2>
                  <p>
                    Veja os destaques da categoria, compare as notas e confira os preços disponíveis.
                  </p>
                  <div className="buying-guide-card-products">
                    {category.featured.map((review) => (
                      <span key={review.slug}>{review.product}</span>
                    ))}
                  </div>
                  <span className="buying-guide-link">Abrir guia →</span>
                </Link>
              ))}
            </div>

            {categories.length === 0 && (
              <div className="side-card">
                <p>Ainda não há categorias com análises suficientes para montar um guia.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
