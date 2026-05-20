import type { CompareTable as CompareTableType } from '@/lib/types';

export default function CompareTable({ table }: { table: CompareTableType }) {
  if (!table || !table.columns || table.columns.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto my-7 border border-border rounded-xl shadow-sm">
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
          {table.rows.map((row, i) => (
            <tr key={i}>
              <td className={row.winner === 0 ? "col-winner" : ""}>{row.feature}</td>
              {row.values.map((val, j) => (
                <td 
                  key={j} 
                  className={j + 1 === row.winner ? "col-winner" : ""}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
