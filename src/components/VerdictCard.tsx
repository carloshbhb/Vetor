import SafeImage from './SafeImage';
import { safeImageSrc } from '@/lib/images';

type VerdictCardProps = {
  product: string;
  imageUrl?: string;
  score: number;
  verdictTitle: string;
  verdictText: string;
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
  price,
  priceCheckedAt,
  affiliateSlug,
}: VerdictCardProps) {
  return (
    <aside className="verdict" id="veredito" aria-label="Resumo da avaliação">
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

      <h2>{verdictTitle}</h2>
      <p>{verdictText}</p>

      {price && (
        <div className="price-line">
          <span>Preço consultado</span>
          <strong>{price}</strong>
        </div>
      )}

      {affiliateSlug && (
        <a
          className="cta"
          href={`/go/${affiliateSlug}/`}
          data-aff-pos="hero"
          target="_blank"
          rel="sponsored nofollow noopener"
        >
          Ver preço e disponibilidade
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
