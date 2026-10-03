import Link from 'next/link';
import type { Review } from '@/lib/types';
import type { MarketplaceOffer } from '@/lib/buying';

function formatDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function BuyingEngine({
  review,
  offers,
}: {
  review: Review;
  offers: MarketplaceOffer[];
}) {
  if (offers.length === 0) return null;

  const datedOffers = offers
    .filter((offer) => formatDate(offer.checkedAt))
    .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
  const latestDate = datedOffers[0]?.checkedAt;
  const numericPrices = offers
    .map((offer) => Number(offer.price.replace(/[^0-9,]/g, '').replace(',', '.')))
    .filter((price) => Number.isFinite(price) && price > 0);
  const hasMultiplePrices = numericPrices.length > 1;

  return (
    <section id="onde-comprar" className="buying-engine" aria-labelledby="onde-comprar-heading">
      <div className="buying-engine-head">
        <div>
          <span className="eyebrow-small">Decisão de compra</span>
          <h2 id="onde-comprar-heading">Onde comprar {review.product}</h2>
          <p>
            Compare as lojas cadastradas para este produto. O Vetor mostra o preço disponível na data da consulta e não trata o valor como garantia de preço futuro.
          </p>
        </div>
        <Link className="buying-method-link" href="/afiliados/">Como funcionam os links</Link>
      </div>

      <div className="buying-offer-grid">
        {offers.map((offer) => {
          const date = formatDate(offer.checkedAt);
          const isValidHref = /^\/|^https:\/\//i.test(offer.href);

          return (
            <article className="buying-offer" key={offer.marketplace + '-' + offer.href}>
              <div className="buying-offer-top">
                <span>{offer.label}</span>
                <strong>{offer.price || 'Ver preço'}</strong>
              </div>
              <div className="buying-offer-meta">
                <span>{hasMultiplePrices ? 'Preço comparável' : 'Preço consultado'}</span>
                {date && <time dateTime={offer.checkedAt}>até {date}</time>}
              </div>
              {isValidHref ? (
                <a
                  className="cta"
                  href={offer.href}
                  data-aff-pos={'buying-' + offer.marketplace}
                  target="_blank"
                  rel={offer.isAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}
                >
                  Ver oferta →
                </a>
              ) : (
                <span className="buying-unavailable">Link de compra não disponível</span>
              )}
            </article>
          );
        })}
      </div>

      <div className="buying-engine-foot">
        <span>
          {latestDate ? 'Valores verificados em ' + formatDate(latestDate) + '.' : 'Valores informados pela página de análise.'}
        </span>
        <strong>Frete, estoque, cupons e condições podem alterar o total.</strong>
      </div>
    </section>
  );
}
