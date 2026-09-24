import type { ReviewSpec } from "@/lib/types";

type SpecTableProps = {
  specs: ReviewSpec[];
};

export default function SpecTable({ specs }: SpecTableProps) {
  if (!specs || specs.length === 0) return null;

  return (
    <div className="spec-table">
      {specs.map((spec, i) => (
        <div key={i} className="spec-row">
          <span className="spec-label">{spec.label}</span>
          <span className="spec-value">{spec.value}</span>
        </div>
      ))}
    </div>
  );
}
