import SafeImage from './SafeImage';
import { safeImageSrc } from '@/lib/images';

type VerdictCardProps = {
  product: string;
  imageUrl?: string;
  score: number;
  verdictTitle: string;
  verdictText: string;
  decisionLabel?: string;
  bestFor?: string[];
  notFor?: string[];
  price?: string;
  priceCheckedAt?: string;
  affiliateSlug?: string;
};

const br = (n: number) => String(n).replace('.', ',');

function formatDateBR(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getDecisionLabel(score: number): string {
  if (score >= 9.2) return 'Compra forte';
  if (score >= 8.5) return 'Boa compra';
  if (score >= 7) return 'Vale considerar';
  return 'Compare antes de comprar';
}

function Stars({ score }: { score: number }) {
  const five = score / 2;
  const full = Math.floor(five);
  const half = five - full >= 0.5;
  return (
    <div className="stars" role="img" aria-label={`Avaliação editorial: ${br(score)} de 10`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
    </div>
  );
}

export default function VerdictCard({
  product,
  imageUrl,
  score,
  verdictTitle,
  verdictText,
  decisionLabel,
  bestFor = [],
  notFor = [],
  price,
  priceCheckedAt,
  affiliateSlug,
}: VerdictCardProps) {
  const signal = decisionLabel || getDecisionLabel(score);
  const positiveFit = bestFor.filter(Boolean).slice(0, 2);
  const negativeFit = notFor.filter(Boolean).slice(0, 2);

  return (
    <aside className="verdict" id="veredito" aria-label="Resumo da avaliação e decisão de compra">
      {imageUrl && (
        <SafeImage
          src={safeImageSrc(imageUrl)}
          width={600}
          height={400}
          alt={`${product}: foto do produto analisado`}
          fetchPriority="high"
        />
      )}
      <span className="verdict-label">Veredito rápido</span>
      <div className="score">
        <strong>{br(score)}</strong>
        <span>/ 10</span>
      </div>
      <Stars score={score} />

      <div className="verdict-signal">
        <span>Sinal do Vetor</span>
        <strong>{signal}</strong>
      </div>

      <h2>{verdictTitle}</h2>
      <p>{verdictText}</p>

      {(positiveFit.length > 0 || negativeFit.length > 0) && (
        <div className="verdict-fit">
          {positiveFit.length > 0 && (
            <div>
              <span>Faz mais sentido para</span>
              <ul>
                {positiveFit.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {negativeFit.length > 0 && (
            <div>
              <span>Talvez não seja ideal para</span>
              <ul>
                {negativeFit.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {price && (
        <div className="price-line">
          <span>Preço consultado</span>
          <strong>{price}</strong>
        </div>
      )}

      {affiliateSlug && (
        <a
          className="cta cta--primary-buy"
          href={`/go/${affiliateSlug}/`}
          data-aff-pos="hero"
          target="_blank"
          rel="sponsored nofollow noopener"
          aria-label={price ? `Conferir oferta e preço de ${product}` : `Ver preço e disponibilidade de ${product}`}
        >
          {price ? 'Conferir oferta e preço' : 'Ver preço e disponibilidade'} →
        </a>
      )}
      {price && priceCheckedAt && formatDateBR(priceCheckedAt) && (
        <div className="micro">
          Preço checado em <time dateTime={priceCheckedAt}>{formatDateBR(priceCheckedAt)}</time>. Pode mudar.
          Link de afiliado: sem custo extra para você.
        </div>
      )}
    </aside>
  );
}
