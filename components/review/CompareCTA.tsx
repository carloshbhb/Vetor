interface CompareCTAProduct {
  name: string;
  priceOld?: string;
  priceNew: string;
  affiliateUrl: string;
  score?: number;
  imageUrl?: string;
}

interface CompareCTAProps {
  products: CompareCTAProduct[];
  eyebrow?: string;
}

export default function CompareCTA({ products, eyebrow = 'Onde Comprar' }: CompareCTAProps) {
  if (!products || products.length < 2) return null;

  return (
    <div className="compare-cta">
      <div className="compare-cta-eyebrow">{eyebrow}</div>
      <div className="compare-cta-grid">
        {products.slice(0, 2).map((product, idx) => (
          <div key={idx} className={`compare-cta-card ${idx === 0 ? 'compare-cta-card--blue' : 'compare-cta-card--pink'}`}>
            <div className="compare-cta-img-wrap">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="compare-cta-img" />
              ) : (
                <div className="compare-cta-img-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
              )}
            </div>
            <h4 className="compare-cta-name">{product.name}</h4>
            {product.score && (
              <div className="compare-cta-score">
                <span className="compare-cta-score-num">{product.score.toFixed(1)}</span>
                <span className="compare-cta-score-total">/10</span>
              </div>
            )}
            {product.priceOld && (
              <div className="compare-cta-price-old">De {product.priceOld}</div>
            )}
            <div className="compare-cta-price">{product.priceNew}</div>
            <a
              href={product.affiliateUrl}
              className={`compare-cta-btn ${idx === 0 ? 'compare-cta-btn--blue' : 'compare-cta-btn--pink'}`}
              target="_blank"
              rel="noopener sponsored nofollow"
            >
              Ver Oferta →
            </a>
            <div className="compare-cta-badge">✓ Compra segura</div>
          </div>
        ))}
        <div className="compare-cta-vs">
          <span>VS</span>
        </div>
      </div>
    </div>
  );
}
