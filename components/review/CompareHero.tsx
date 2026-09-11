interface HeroProductCard {
  name: string;
  score: number;
  priceNew: string;
  priceOld?: string;
  affiliateUrl: string;
  imageUrl?: string;
}

interface CompareHeroProps {
  products: HeroProductCard[];
  headline: string;
}

export default function CompareHero({ products, headline }: CompareHeroProps) {
  if (!products || products.length < 2) return null;

  const winner = products[0].score >= products[1].score ? 0 : 1;
  const loser = winner === 0 ? 1 : 0;

  return (
    <div className="compare-hero">
      <div className="compare-hero-badge">COMPARATIVO</div>
      <h1 className="compare-hero-title">{headline}</h1>
      <div className="compare-hero-grid">
        {products.map((product, idx) => (
          <div
            key={idx}
            className={`compare-hero-card ${idx === winner ? 'compare-hero-card--winner' : ''}`}
          >
            {idx === winner && (
              <div className="compare-hero-winner-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 15l-3 3 1-4-3-2h4L12 8l1 4h4l-3 2 1 4z" />
                </svg>
                VENCEDOR
              </div>
            )}
            <div className="compare-hero-img-wrap">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="compare-hero-img" />
              ) : (
                <div className="compare-hero-img-placeholder">{product.name[0]}</div>
              )}
            </div>
            <h3 className="compare-hero-name">{product.name}</h3>
            <div className="compare-hero-score">
              <span className="compare-hero-score-num">{product.score.toFixed(1)}</span>
              <span className="compare-hero-score-total">/10</span>
            </div>
            {product.priceOld && (
              <div className="compare-hero-price-old">De {product.priceOld}</div>
            )}
            <div className="compare-hero-price">{product.priceNew}</div>
            <a
              href={product.affiliateUrl}
              className={`compare-hero-btn ${idx === winner ? 'compare-hero-btn--winner' : ''}`}
              target="_blank"
              rel="noopener sponsored nofollow"
            >
              Ver Oferta →
            </a>
          </div>
        ))}
        <div className="compare-hero-vs">
          <span>VS</span>
        </div>
      </div>
    </div>
  );
}
