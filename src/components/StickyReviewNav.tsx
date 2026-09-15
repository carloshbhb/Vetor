"use client";

import { useEffect, useRef, useState } from "react";

type StickyReviewNavProps = {
  sections: Array<{ id: string; label: string }>;
  score: number;
  affiliateUrl?: string;
  product: string;
};

export default function StickyReviewNav({ sections, score, affiliateUrl, product }: StickyReviewNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const links = nav.querySelectorAll<HTMLAnchorElement>(".snav-link");
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
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      ref={navRef}
      className="sticky-nav"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "var(--bg)",
        borderBottom: "1.5px solid var(--border)",
        boxShadow: visible ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
      }}
      aria-label="Seções do review"
    >
      <div className="sticky-nav-inner" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56, gap: 20 }}>
        <a href="/" className="snav-logo" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: "0.9rem", color: "var(--blue)", textDecoration: "none", flexShrink: 0, letterSpacing: "-0.01em" }}>
          vetor<span style={{ color: "var(--ink)" }}>.blog</span>
        </a>
        <ul className="snav-links" style={{ display: "flex", gap: 0, listStyle: "none", flex: 1, justifyContent: "center", overflow: "auto" }}>
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="snav-link"
                style={{
                  display: "block",
                  padding: "0 16px",
                  height: 56,
                  lineHeight: "56px",
                  fontFamily: "'Syne',sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  color: "var(--body)",
                  textDecoration: "none",
                  borderBottom: "2.5px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        {affiliateUrl && (
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="snav-cta"
            style={{
              background: "var(--cta)",
              color: "#fff",
              padding: "9px 20px",
              borderRadius: 6,
              fontFamily: "'Syne',sans-serif",
              fontWeight: 800,
              fontSize: "0.76rem",
              letterSpacing: "0.03em",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
          >
            Ver Oferta
          </a>
        )}
      </div>
    </nav>
  );
}
