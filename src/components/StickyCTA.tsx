"use client";

import { useState, useEffect } from "react";

interface StickyCTAProps {
  price: string;
  affiliateUrl?: string;
  productName: string;
  showOnDesktop?: boolean;
}

export default function StickyCTA({ price, affiliateUrl, productName, showOnDesktop = true }: StickyCTAProps) {
  const [visible, setVisible] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const shouldShow = visible && (showOnDesktop || !isDesktop);

  if (!shouldShow) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="container flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted truncate">{productName}</p>
          <p className="text-lg font-bold text-green">{price}</p>
        </div>
        <a
          href={affiliateUrl || "#"}
          target={affiliateUrl ? "_blank" : undefined}
          style={{
            background: "var(--cta)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "4px",
            padding: "12px 24px",
            fontFamily: "var(--font-heading)",
            fontWeight: "800",
            fontSize: "0.875rem",
            letterSpacing: "0.03em",
            transition: "background 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseOver={(e) => (e.currentTarget as HTMLAnchorElement).style.background = "var(--cta-dk)"}
          onMouseOut={(e) => (e.currentTarget as HTMLAnchorElement).style.background = "var(--cta)"}
          rel={affiliateUrl ? "noopener noreferrer" : undefined}
        >
          Ver Menor Preço
        </a>
      </div>
    </div>
  );
}