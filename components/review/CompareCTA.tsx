interface CompareCTAProduct {
  name: string;
  priceOld?: string;
  priceNew: string;
  affiliateUrl: string;
  score?: number;
}

interface CompareCTAProps {
  products: CompareCTAProduct[];
  eyebrow?: string;
}

export default function CompareCTA({ products, eyebrow = 'Onde Comprar' }: CompareCTAProps) {
  if (!products || products.length < 2) return null;

  return (
    <div className="compare-cta" style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '0',
      margin: '32px 0',
      borderRadius: '16px',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      background: '#fff',
    }}>
      {products.slice(0, 2).map((product, idx) => (
        <div key={idx} style={{
          padding: '24px',
          textAlign: 'center',
          background: idx === 0 ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
        }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '.7rem',
            fontWeight: 800,
            letterSpacing: '.15em',
            textTransform: 'uppercase',
            opacity: 0.6,
            marginBottom: '8px',
          }}>
            {eyebrow}
          </div>
          <h4 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1rem',
            fontWeight: 700,
            margin: '0 0 12px',
            color: '#0f172a',
          }}>
            {product.name}
          </h4>
          {product.score && (
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#2563eb',
              marginBottom: '8px',
            }}>
              {product.score.toFixed(1)}<span style={{ fontSize: '.8rem', opacity: 0.6 }}>/10</span>
            </div>
          )}
          {product.priceOld && (
            <div style={{ fontSize: '.85rem', textDecoration: 'line-through', opacity: 0.5 }}>
              De {product.priceOld}
            </div>
          )}
          <div style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: '#16a34a',
            marginBottom: '16px',
          }}>
            {product.priceNew}
          </div>
          <a
            href={product.affiliateUrl}
            className="btn-white"
            target="_blank"
            rel="noopener sponsored nofollow"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '.9rem',
              textDecoration: 'none',
              color: '#fff',
              background: idx === 0 ? '#2563eb' : '#db2777',
              transition: 'transform .15s, box-shadow .15s',
            }}
          >
            Ver Oferta →
          </a>
          <p style={{ fontSize: '.7rem', opacity: 0.5, marginTop: '8px' }}>
            ✓ Compra segura · Frete grátis
          </p>
        </div>
      ))}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 4px',
        background: '#f8fafc',
      }}>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: '1.2rem',
          fontWeight: 900,
          color: '#94a3b8',
          letterSpacing: '.05em',
        }}>
          VS
        </span>
      </div>
    </div>
  );
}
