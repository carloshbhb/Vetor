interface ProductProsCons {
  name: string;
  pros: string[];
  cons: string[];
  score?: number;
  imageUrl?: string;
}

interface CompareProsConsProps {
  products: ProductProsCons[];
}

export default function CompareProsCons({ products }: CompareProsConsProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className="compare-proscons">
      {products.slice(0, 2).map((product, idx) => (
        <div key={idx} className={`compare-proscons-card ${idx === 0 ? 'compare-proscons-card--blue' : 'compare-proscons-card--pink'}`}>
          <div className="compare-proscons-header">
            <div className="compare-proscons-img-wrap">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="compare-proscons-img" />
              ) : (
                <div className="compare-proscons-img-placeholder">{product.name[0]}</div>
              )}
            </div>
            <div>
              <h4 className="compare-proscons-name">{product.name}</h4>
              {product.score && (
                <div className="compare-proscons-score">
                  Nota: {product.score.toFixed(1)}/10
                </div>
              )}
            </div>
          </div>
          <div className="compare-proscons-body">
            {product.pros.length > 0 && (
              <div className="compare-proscons-section">
                <div className="compare-proscons-label compare-proscons-label--pro">✓ Prós</div>
                <ul className="compare-proscons-list">
                  {product.pros.map((pro, i) => (
                    <li key={i} className="compare-proscons-item compare-proscons-item--pro">
                      <span className="compare-proscons-icon">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.cons.length > 0 && (
              <div className="compare-proscons-section">
                <div className="compare-proscons-label compare-proscons-label--con">× Contras</div>
                <ul className="compare-proscons-list">
                  {product.cons.map((con, i) => (
                    <li key={i} className="compare-proscons-item compare-proscons-item--con">
                      <span className="compare-proscons-icon">−</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
