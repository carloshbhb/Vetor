import SafeImage from './SafeImage';
import { safeImageSrc } from '@/lib/images';

export type VsProduct = {
  name: string;
  imageUrl?: string;
  eyebrow: string;
  summary: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaPos?: string;
  external?: boolean;
  fetchPriority?: boolean;
};

export default function VsCards({ products }: { products: VsProduct[] }) {
  if (products.length === 0) return null;
  const pair = products.length === 2;
  return (
    <div
      className="vs"
      style={pair ? undefined : { gridTemplateColumns: `repeat(${products.length}, 1fr)` }}
    >
      {products.map((p, i) => (
        <div key={p.name} style={{ display: 'contents' }}>
          {pair && i === 1 && (
            <div className="vs-mid" aria-hidden="true">
              VS
            </div>
          )}
          <div className="vs-card">
            <span className="tag">{p.eyebrow}</span>
            {p.imageUrl && (
              <SafeImage
                src={safeImageSrc(p.imageUrl)}
                width={600}
                height={400}
                alt={p.name}
                fetchPriority={p.fetchPriority ? 'high' : undefined}
                loading={p.fetchPriority ? undefined : 'lazy'}
              />
            )}
            <h2>{p.name}</h2>
            <p>{p.summary}</p>
            {p.ctaHref &&
              (p.external ? (
                <a
                  className="cta cta--primary-buy"
                  href={p.ctaHref}
                  data-aff-pos={p.ctaPos ?? 'hero-vs'}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  aria-label={p.ctaLabel ? p.ctaLabel + " — " + p.name : "Ver preço de " + p.name}
                >
                  {p.ctaLabel ?? 'Ver preço'}
                </a>
              ) : (
                <a className="cta" href={p.ctaHref} aria-label={(p.ctaLabel ?? "Ler review") + " — " + p.name}>
                  {p.ctaLabel ?? 'Ler review'}
                </a>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
