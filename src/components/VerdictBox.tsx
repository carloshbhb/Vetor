import Link from "next/link";

type VerdictBoxProps = {
  score: number;
  label: string;
  text: string;
  affiliateUrl?: string;
};

export default function VerdictBox({ score, label, text, affiliateUrl }: VerdictBoxProps) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-8 my-9"
      style={{
        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <span
        className="absolute right-5 top-4 font-display text-[5rem] leading-none pointer-events-none"
        style={{ color: "rgba(245,158,11,0.05)", letterSpacing: "0.05em" }}
      >
        VEREDICTO
      </span>
      <div className="flex items-center gap-4 mb-4">
        <span className="font-display text-amber" style={{ fontSize: "4rem", lineHeight: 1, borderRight: "1px solid rgba(245,158,11,0.2)", paddingRight: 16 }}>
          {score.toFixed(1)}
        </span>
        <div>
          <div className="font-heading font-extrabold text-[1.1rem] text-text">Veredicto: {label}</div>
        </div>
      </div>
      <p className="text-[0.95rem] text-[#9AA8C4] font-light leading-[1.8] mb-5">
        {text}
      </p>
      {affiliateUrl && (
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center gap-2.5 bg-amber text-black font-heading font-extrabold text-[0.82rem] tracking-wide px-7 py-3 rounded-full transition-all hover:bg-white hover:shadow-[0_10px_30px_rgba(245,158,11,0.25)]"
        >
          Comprar Agora
        </a>
      )}
    </div>
  );
}