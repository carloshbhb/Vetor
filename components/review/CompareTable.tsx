import type { CompareTable as CompareTableType } from '@/lib/types';

interface CompareTableProps {
  table: CompareTableType;
  productImages?: string[];
  productNames?: string[];
}

export default function CompareTable({ table, productImages, productNames }: CompareTableProps) {
  if (!table || !table.columns || table.columns.length === 0) return null;

  return (
    <div className="compare-table-wrapper">
      {/* Product headers with images */}
      {productImages && productImages.length >= 2 && productNames && (
        <div className="compare-products-header">
          {productNames.slice(0, 2).map((name, idx) => (
            <div key={idx} className="compare-product-card">
              <div className="compare-product-img-wrap">
                {productImages[idx] ? (
                  <img src={productImages[idx]} alt={name} className="compare-product-img" />
                ) : (
                  <div className="compare-product-img-placeholder">{name[0]}</div>
                )}
              </div>
              <span className="compare-product-name">{name}</span>
            </div>
          ))}
          <div className="compare-vs-badge">VS</div>
        </div>
      )}

      <div className="w-full overflow-x-auto border border-border rounded-xl shadow-sm">
        <table className="compare-table !my-0 border-0">
          {table.caption && <caption>{table.caption}</caption>}
          <thead>
            <tr>
              {table.columns.map((col, i) => (
                <th
                  key={i}
                  scope="col"
                  className={i === table.winnerCol ? "col-winner" : ""}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => {
              const feature = row.feature || '';
              const values = Array.isArray(row.values) ? row.values : [];
              const winner = typeof row.winner === 'number' ? row.winner : 0;
              return (
                <tr key={i} className={i % 2 === 0 ? 'compare-row-even' : 'compare-row-odd'}>
                  <td className={winner === 0 ? "col-winner" : ""}>{feature}</td>
                  {values.map((val, j) => (
                    <td
                      key={j}
                      className={j + 1 === winner ? "col-winner" : ""}
                    >
                      {j + 1 === winner && <span className="winner-check">✓</span>}
                      {val}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
