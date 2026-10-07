import Link from 'next/link';
import { parseReviewPrice } from '@/lib/buying';
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
    .map((offer) => parseReviewPrice(offer.price))
    .filter((price): price is number => price !== null);
  const lowestPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : null;
  const hasMultiplePrices = numericPrices.length > 1;

  return (
    <section id="onde-comprar" className="buying-engine" aria-labelledby="onde-comprar-heading">
      <div className="buying-engine-head">
        <div>
          <span className="eyebrow-small">Decisão de compra</span>
          <h2 id="onde-comprar-heading">Onde comprar {review.product}</h2>
          <p>
            Compare as lojas cadastradas para este produto. O Vetor destaca o menor preço entre os valores consultados, sem tratar o resultado como garantia de preço futuro.
          </p>
        </div>
        <Link className="buying-method-link" href="/afiliados/">Como funcionam os links</Link>
      </div>

      {lowestPrice !== null && (
        <div className="buying-engine-signal" role="status">
          <span>Menor preço consultado</span>
          <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lowestPrice)}</strong>
          <small>entre os preços disponíveis neste review</small>
        </div>
      )}

      <div className="buying-offer-grid">
        {offers.map((offer) => {
          const date = formatDate(offer.checkedAt);
          const isValidHref = /^\/|^https:\/\//i.test(offer.href);
          const price = parseReviewPrice(offer.price);
          const isLowestPrice = price !== null && lowestPrice !== null && price === lowestPrice;

          return (
            <article className={`buying-offer${isLowestPrice ? ' buying-offer--best' : ''}`} key={offer.marketplace + '-' + offer.href}>
              {isLowestPrice && <span className="buying-offer-badge">Menor preço consultado</span>}
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
                  className="cta cta--primary-buy"
                  href={offer.href}
                  data-aff-pos={'buying-' + offer.marketplace}
                  target="_blank"
                  rel={offer.isAffiliate ? 'sponsored nofollow noopener' : 'nofollow noopener'}
                  aria-label={
                    isLowestPrice
                      ? `Conferir o menor preço consultado na ${offer.label}`
                      : offer.price
                        ? `Conferir preço na ${offer.label}`
                        : `Consultar preço na ${offer.label}`
                  }
                >
                  {isLowestPrice ? 'Ver menor preço' : offer.price ? 'Conferir preço na loja' : 'Consultar preço'} →
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
