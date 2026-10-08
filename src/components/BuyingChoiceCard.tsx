import Link from 'next/link';
import SafeImage from './SafeImage';
import { safeImageSrc } from '@/lib/images';
import type { Review } from '@/lib/types';
import { getBuyingIntentLabel, marketplaceLabel, reviewScore, type BuyingIntent } from '@/lib/buying';

const br = (n: number) => String(n).replace('.', ',');

export default function BuyingChoiceCard({
  review,
  rank,
  intent,
  context = 'ranking',
  imageUrl,
  ctaHref,
  ctaLabel,
  ctaPos,
}: {
  review: Review;
  rank: number;
  intent?: BuyingIntent;
  context?: 'ranking' | 'review' | 'comparison';
  imageUrl?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaPos?: string;
}) {
  const score = reviewScore(review);
  const label = context === 'review'
    ? 'Produto analisado'
    : context === 'comparison'
      ? rank === 1 ? '🥇 Melhor escolha' : rank === 2 ? '🥈 Alternativa' : `Posição ${rank}`
      : intent
        ? `${getBuyingIntentLabel(intent)} · posição ${rank}`
        : rank === 1 ? 'Destaque da seleção' : rank === 2 ? 'Alternativa em destaque' : 'Outra opção';
  const image = imageUrl || review.image_url;
  const canBuy = Boolean(review.affiliate_url || ctaHref);
  const finalCtaHref = ctaHref || `/go/${review.slug}/`;
  const finalCtaLabel = ctaLabel || (review.price_new ? 'Conferir preço' : 'Ver preço');
  const finalCtaPos = ctaPos || 'melhores-' + (intent || 'geral') + '-' + rank;

  return (
    <article className={'buying-choice' + (rank === 1 ? ' buying-choice--featured' : '')}>
      <div className="buying-choice-rank">{String(rank).padStart(2, '0')}</div>
      {image && (
        <SafeImage
          src={safeImageSrc(image)}
          width={600}
          height={400}
          alt={review.product + ': produto selecionado pelo Vetor'}
          loading={rank === 1 ? 'eager' : 'lazy'}
        />
      )}

      <div className="buying-choice-body">
        <span className="tag">{label}</span>
        <h2>{review.product}</h2>
        <p>{review.hero_lead || review.meta_description}</p>

        <div className="buying-choice-facts">
          <span><small>Nota Vetor</small><strong>{br(score)}/10</strong></span>
          <span><small>Preço consultado</small><strong>{review.price_new || 'Confira'}</strong></span>
          <span><small>Marketplace</small><strong>{marketplaceLabel(review.marketplace)}</strong></span>
        </div>

        <div className="buying-choice-actions">
          <Link href={'/reviews/' + review.slug + '/'} className="buying-choice-review">
            Ler análise completa
          </Link>
          {canBuy ? (
            <a
              className="cta cta--primary-buy"
              href={finalCtaHref}
              data-aff-pos={finalCtaPos}
              target="_blank"
              rel="sponsored nofollow noopener"
              aria-label={`${finalCtaLabel} — ${review.product}`}
            >
              {finalCtaLabel} →
            </a>
          ) : (
            <Link className="cta" href={'/reviews/' + review.slug + '/'}>
              Ver detalhes →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
