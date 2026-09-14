"use client";

import { useEffect, useRef } from "react";
import type { ReviewSection } from "@/lib/types";

type TOCSidebarProps = {
  sections: ReviewSection[];
  score: number;
  affiliateUrl?: string;
};

export default function TOCSidebar({ sections, score, affiliateUrl }: TOCSidebarProps) {
  const verdictLabel = score >= 8 ? "Recomendado" : score >= 5 ? "Razoável" : "Não Recomendado";
  const verdictColor = score >= 8 ? "var(--green)" : score >= 5 ? "var(--amber)" : "var(--red)";
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const links = nav.querySelectorAll<HTMLAnchorElement>(".toc-link");
    const sectionIds = Array.from(links).map((a) => a.getAttribute("href")?.replace("#", "")).filter((id): id is string => !!id);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            links.forEach((a) => a.classList.remove("active"));
            const target = nav.querySelector<HTMLAnchorElement>(`a[href="#${entry.target.id}"]`);
            if (target) target.classList.add("active");
          }
        });
      },
      { rootMargin: "-30% 0px -65% 0px" }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav ref={navRef} className="bg-surface border border-border rounded-[10px] sticky" style={{ top: 88, padding: "22px 20px" }} aria-label="Índice do review">
      <div className="font-heading text-[0.68rem] font-bold tracking-[0.12em] uppercase text-muted mb-3.5 pb-2.5 border-b border-border">
        Neste Review
      </div>
      <ul className="flex flex-col gap-0.5">
        {sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`toc-link block py-[7px] px-2.5 rounded-lg font-heading text-[0.76rem] font-semibold text-body hover:bg-blue-lt hover:text-blue transition-colors${index === 0 ? " active" : ""}`}
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ul>
      <div className="h-px bg-border my-2.5" />
      <div className="font-heading text-[0.7rem] font-bold text-muted tracking-[0.06em] uppercase mb-1.5">
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
          className="block text-center mt-3.5 font-heading font-extrabold text-[0.72rem] tracking-wider py-2.5 rounded-md transition-all bg-cta text-white hover:bg-cta-dk"
        >
          Comprar agora →
        </a>
      )}
    </nav>
  );
}
