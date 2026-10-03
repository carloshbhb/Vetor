import Link from 'next/link';
import {
  getBuyingIntentDescription,
  getBuyingIntentLabel,
  type BuyingIntentPage,
} from '@/lib/buying';

export default function ReviewPurchaseIntentLinks({
  categoryName,
  pages,
}: {
  categoryName: string;
  pages: BuyingIntentPage[];
}) {
  if (pages.length === 0) return null;

  return (
    <section className="buying-intent-section" aria-labelledby="review-purchase-intent-heading">
      <div className="section-kicker">Mais caminhos de compra</div>
      <h2 id="review-purchase-intent-heading">Encontre esta categoria por intenção</h2>
      <p>
        Você pode consultar a mesma categoria por menor preço consultado ou por uma fórmula
        explícita de custo-benefício. As seleções abaixo só aparecem quando existe volume suficiente
        de reviews com preço disponível.
      </p>

      <div className="buying-intent-section-links">
        <Link className="cta" href={'/melhores/' + pages[0].categorySlug + '/'}>
          Ver guia de compra →
        </Link>
        <Link href={'/reviews/categoria/' + encodeURIComponent(categoryName) + '/'}>
          Ver todos os reviews da categoria
        </Link>
      </div>

      <div className="buying-intent-grid">
        {pages.map((page) => {
          const label = getBuyingIntentLabel(page.intent);
          return (
            <Link
              key={page.intent}
              className="buying-intent-card"
              href={'/melhores/' + page.categorySlug + '/' + page.intent + '/'}
            >
              <span>{label}</span>
              <strong>{label} em {categoryName}</strong>
              <small>{getBuyingIntentDescription(page.intent, categoryName)}</small>
              <small>{page.count} opções comparáveis nesta seleção.</small>
              <b>Ver seleção →</b>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
