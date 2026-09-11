interface ProductProsCons {
  name: string;
  pros: string[];
  cons: string[];
  score?: number;
}

interface CompareProsConsProps {
  products: ProductProsCons[];
}

export default function CompareProsCons({ products }: CompareProsConsProps) {
  if (!products || products.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${Math.min(products.length, 2)}, 1fr)`,
      gap: '20px',
      margin: '24px 0',
    }}>
      {products.slice(0, 2).map((product, idx) => (
        <div key={idx} style={{
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          background: '#fff',
        }}>
          <div style={{
            padding: '16px 20px',
            background: idx === 0 ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' : 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <h4 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: '.95rem',
              fontWeight: 700,
              margin: 0,
              color: '#0f172a',
            }}>
              {product.name}
            </h4>
            {product.score && (
              <div style={{
                fontSize: '.8rem',
                fontWeight: 600,
                color: idx === 0 ? '#2563eb' : '#db2777',
                marginTop: '4px',
              }}>
                Nota: {product.score.toFixed(1)}/10
              </div>
            )}
          </div>
          <div style={{ padding: '16px 20px' }}>
            {product.pros.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  color: '#16a34a',
                  marginBottom: '8px',
                }}>
                  ✓ Prós
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'none' }}>
                  {product.pros.map((pro, i) => (
                    <li key={i} style={{
                      fontSize: '.85rem',
                      color: '#334155',
                      marginBottom: '6px',
                      position: 'relative',
                      paddingLeft: '4px',
                    }}>
                      <span style={{ color: '#16a34a', marginRight: '6px' }}>+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.cons.length > 0 && (
              <div>
                <div style={{
                  fontSize: '.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  color: '#dc2626',
                  marginBottom: '8px',
                }}>
                  × Contras
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', listStyle: 'none' }}>
                  {product.cons.map((con, i) => (
                    <li key={i} style={{
                      fontSize: '.85rem',
                      color: '#64748b',
                      marginBottom: '6px',
                      position: 'relative',
                      paddingLeft: '4px',
                    }}>
                      <span style={{ color: '#dc2626', marginRight: '6px' }}>−</span>
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
