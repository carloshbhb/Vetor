import Link from 'next/link';
import type { ProductLink } from '@/lib/product-links';
import type { Review } from '@/lib/types';
import { marketplaceLabel } from '@/lib/buying';

type RelatedCommercialItem = {
  link: ProductLink;
  review: Review;
};

function formatPrice(value: number | null): string | null {
  if (value === null || value <= 0) return null;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RelatedCommercialProducts({
  items,
}: {
  items: RelatedCommercialItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section id="alternativas" className="related-commercial" aria-labelledby="produtos-relacionados-heading">
      <div className="section-kicker">Alternativas com oferta</div>
      <h2 id="produtos-relacionados-heading">Compare outros produtos antes de comprar</h2>
      <p>
        Estas alternativas já têm review publicado no Vetor e um link comercial cadastrado.
        O preço só é exibido quando existe um valor registrado no cadastro da oferta.
      </p>

      <div className="related-commercial-grid">
        {items.map(({ link, review }) => {
          const price = formatPrice(link.price);
          const score = review.verdict_score || review.hero_overall_score;
          return (
            <article className="related-commercial-card" key={link.review_slug}>
              <span className="tag">Review publicado</span>
              <h3>{review.product}</h3>
              <div className="related-commercial-facts">
                <span>
                  <small>Nota Vetor</small>
                  <strong>{String(score).replace('.', ',')}/10</strong>
                </span>
                <span>
                  <small>Loja</small>
                  <strong>{marketplaceLabel(link.marketplace)}</strong>
                </span>
                <span>
                  <small>Preço cadastrado</small>
                  <strong>{price || 'Não informado'}</strong>
                </span>
              </div>
              <div className="related-commercial-actions">
                <Link className="related-commercial-review" href={'/reviews/' + review.slug + '/'}>
                  Ler análise → 
                </Link>
                <a
                  className="cta cta--primary-buy"
                  href={'/go/' + link.slug + '/'}
                  data-aff-pos={'related-' + link.slug}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  aria-label={price ? `Conferir preço de ${review.product}` : `Ver oferta de ${review.product}`}
                >
                  {price ? 'Conferir preço' : 'Ver oferta'} →
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
