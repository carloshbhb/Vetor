"use client";

import { useState, useEffect, useRef } from "react";

interface DesktopStickyCTAProps {
  price: string;
  affiliateUrl?: string;
  productName: string;
  productImage?: string;
  rating?: number;
  reviewCount?: number;
}

export default function DesktopStickyCTA({
  price,
  affiliateUrl,
  productName,
  productImage,
  rating,
  reviewCount,
}: DesktopStickyCTAProps) {
  const [visible, setVisible] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > 400);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 20);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={`hidden lg:block fixed right-4 top-20 z-40 w-72 transition-all duration-300 ${
        isSticky ? "top-20" : "top-auto bottom-4"
      }`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        boxShadow: "var(--box-shadow-sm)",
        padding: "16px",
      }}
    >
      <div className="flex items-start gap-3">
        {productImage && (
          <img
            src={productImage}
            alt={productName}
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            style={{ border: "1px solid var(--border)" }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted truncate font-medium">{productName}</p>
          <p className="text-xl font-bold text-ink mt-1">{price}</p>
          {rating && reviewCount && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-amber">★</span>
              <span className="text-sm font-medium text-ink">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted">({reviewCount} avaliações)</span>
            </div>
          )}
        </div>
      </div>
      <a
        href={affiliateUrl || "#"}
        target={affiliateUrl ? "_blank" : undefined}
        rel={affiliateUrl ? "noopener noreferrer" : undefined}
        className="block mt-4 text-center"
        style={{
          background: "var(--cta)",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "8px",
          padding: "14px 24px",
          fontFamily: "var(--font-heading)",
          fontWeight: "800",
          fontSize: "0.875rem",
          letterSpacing: "0.03em",
          transition: "background 0.15s, transform 0.1s",
          display: "block",
          textDecoration: "none",
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--cta-dk)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--cta)";
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
        }}
      >
        Ver Menor Preço no ML
      </a>
      <p className="text-xs text-muted text-center mt-2">
        Redireciona para o Mercado Livre
      </p>
    </div>
  );
}