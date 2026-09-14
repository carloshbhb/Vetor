"use client";

import type { ReviewSection } from "@/lib/types";

type TOCSidebarProps = {
  sections: ReviewSection[];
  score: number;
  affiliateUrl?: string;
  productName?: string;
};

export default function TOCSidebar({ sections, score, affiliateUrl, productName }: TOCSidebarProps) {
  const verdictLabel = score >= 8 ? "Recomendado" : score >= 5 ? "Razoável" : "Não Recomendado";
  const verdictColor = score >= 8 ? "var(--green)" : score >= 5 ? "var(--amber)" : "var(--red)";

  return (
    <nav className="bg-surface border border-border rounded-2xl p-5 sticky top-24" aria-label="Índice do review">
      <div className="font-heading text-[0.68rem] font-bold tracking-[0.12em] uppercase text-muted mb-3.5 pb-2.5 border-b border-border">
        Neste Review
      </div>
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block py-1.5 px-2.5 rounded-lg font-heading text-[0.76rem] font-semibold text-muted hover:bg-surface2 hover:text-text transition-colors"
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ul>
      <div className="h-px bg-border my-2.5" />
      <div className="font-heading text-[0.7rem] font-bold text-muted tracking-wider uppercase mb-1.5">
        Nota Final
      </div>
      <div className="font-display text-amber" style={{ fontSize: "3rem", lineHeight: 1 }}>
        {score.toFixed(1)}
      </div>
      <div className="font-heading text-[0.7rem] font-bold mb-3" style={{ color: verdictColor }}>
        ✓ {verdictLabel}
      </div>
      {affiliateUrl && (
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block text-center font-heading font-extrabold text-[0.72rem] tracking-wider py-2.5 rounded-[10px] transition-all"
          style={{
            background: "var(--amber-bg)",
            border: "1px solid rgba(245,158,11,0.2)",
            color: "var(--amber)",
          }}
        >
          Comprar →
        </a>
      )}
    </nav>
  );
}