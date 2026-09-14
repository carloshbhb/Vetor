import type { ReviewSpec } from "@/lib/types";

type SpecTableProps = {
  specs: ReviewSpec[];
};

export default function SpecTable({ specs }: SpecTableProps) {
  if (!specs || specs.length === 0) return null;

  return (
    <table className="w-full border-collapse my-6">
      <tbody>
        {specs.map((spec, i) => (
          <tr key={i} className="border-b border-border last:border-b-0">
            <td className="py-2.5 pr-4 text-[0.86rem] align-top font-heading font-bold text-muted" style={{ width: "38%", fontSize: "0.76rem", letterSpacing: "0.02em" }}>
              {spec.label}
            </td>
            <td className="py-2.5 text-[0.86rem] text-[#A0AEC0] font-light">
              {spec.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}