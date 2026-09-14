import type { ReviewSpec } from "@/lib/types";

type SpecTableProps = {
  specs: ReviewSpec[];
};

export default function SpecTable({ specs }: SpecTableProps) {
  if (!specs || specs.length === 0) return null;

  return (
    <div className="overflow-x-auto my-8">
      <table className="w-full border-collapse" style={{ border: "1.5px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <thead>
          <tr>
            <th className="bg-ink text-white py-4 px-5 text-left font-heading text-[0.78rem] font-bold tracking-[0.04em]" style={{ borderRight: "1px solid rgba(255,255,255,0.1)" }}>Especificação</th>
            <th className="bg-ink text-white py-4 px-5 text-left font-heading text-[0.78rem] font-bold tracking-[0.04em]">Valor</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec, i) => (
            <tr key={i} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
              <td className="py-3.5 px-5 font-heading font-bold text-[0.8rem] text-ink" style={{ borderRight: "1px solid var(--border)" }}>
                {spec.label}
              </td>
              <td className="py-3.5 px-5 text-[0.9rem] text-body font-light">
                {spec.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
