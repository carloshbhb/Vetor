"use client";

import { useState, useEffect } from "react";

interface StickyCTAProps {
  price: string;
  affiliateUrl?: string;
  productName: string;
}

export default function StickyCTA({ price, affiliateUrl, productName }: StickyCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-bg border-t border-border px-4 py-3 transition-transform duration-300 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ boxShadow: "0 -2px 12px rgba(0,0,0,0.08)" }}
    >
      <div className="container flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted truncate">{productName}</p>
          <p className="text-lg font-bold text-green">{price}</p>
        </div>
        <a
          href={affiliateUrl || "#"}
          target={affiliateUrl ? "_blank" : undefined}
          rel={affiliateUrl ? "noopener noreferrer" : undefined}
          className="bg-cta text-white text-sm font-heading font-extrabold px-5 py-2.5 rounded-md hover:bg-cta-dk transition-colors whitespace-nowrap flex-shrink-0"
        >
          Ver Menor Preço
        </a>
      </div>
    </div>
  );
}
