import type { ReviewSpec } from "@/lib/types";

type SpecTableProps = {
  specs: ReviewSpec[];
};

export default function SpecTable({ specs }: SpecTableProps) {
  if (!specs || specs.length === 0) return null;

  return (
    <div>
      {specs.map((spec, i) => (
        <div className="price-line" key={i}>
          <span>{spec.label}</span>
          <strong>{spec.value}</strong>
        </div>
      ))}
    </div>
  );
}
