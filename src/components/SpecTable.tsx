import type { ReviewSpec } from "@/lib/types";

type SpecTableProps = {
  specs: ReviewSpec[];
};

export default function SpecTable({ specs }: SpecTableProps) {
  if (!specs || specs.length === 0) return null;

  return (
    <div className="spec-table-wrap">
      <table className="spec-table">
        <caption>Ficha técnica do produto analisado</caption>
        <tbody>
          {specs.map((spec, i) => (
            <tr key={i}>
              <th scope="row">{spec.label}</th>
              <td>{spec.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
